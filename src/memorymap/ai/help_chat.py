"""In-app guidance chat: "how do I..." answers about MemoryMap itself.

ROADMAP.md item 40's "mini AI chat half", deliberately its own path,
separate from `librarian.converse`/`librarian.answer`, because those two
answer from the user's notes or hold a general conversation, and this one
must do neither: it only explains the app. Uses the utility model (not the
main chat model), its own system prompt, and a preset that is Quick's shape
(low temperature, a 256-token cap) with one difference: thinking is left to
the model rather than turned off, because the panel draws the thinking while
it happens and Quick's `think: False` made that box dead markup
(`presets.GUIDE_MODE`, which is off the user-facing picker on purpose).

**The model is the utility model, and it is the utility model's own
fallbacks that decide what that means.** `ModelManager.utility_model()`
answers the chat model in two cases: smart model routing turned off, and no
utility model chosen. Both are the documented behaviour and neither is a bug
here, but together they are why the Guide can be seen running the chat model
while every line of copy around it says "your utility model", so
`tests/test_help_chat.py` pins which model a real request takes in each of
the three cases rather than leaving it to be read off this sentence.

**Grounded, not just instructed.** A first version of this module told the
model "don't invent a feature you're not sure exists" and gave it nothing
else to go on, for a small local model that has never heard of MemoryMap,
that is an instruction with no way to follow it: refusing to guess and
guessing wrong look identical from inside the prompt. `HELP_TOPICS` below is
the fix: a short, factual reference entry per feature area, the same
material the Help accordion already shows in `frontend/index.html`. The
question is matched against it by keyword, and whichever entries match get
attached to the prompt as the only material the model is allowed to answer
from. Keeping `HELP_TOPICS` in step with the accordion (and the accordion in
step with the app) is what "the chatbot's information is up to date" means
in practice, and it is why this module, not the docs alone, is the thing
future sessions should re-check first when a feature's behaviour changes.

No persistence: nothing here writes to the database. The caller (the
frontend) is the one holding the running transcript, in memory only, for
exactly as long as the spec allows, this module only ever sees what it's
handed on each call.
"""

from __future__ import annotations

import re
from collections.abc import Iterator

from memorymap import SUPPORT_EMAIL
from memorymap.ai import AI_NAME
from memorymap.ai import presets
from memorymap.ai.model_manager import ModelManager
from memorymap.ai.provider import Provider

#: **The guide's name, in one place** (INBOX 204, the owner: "give the help ai
#: a name fitting for the application like a persona and improve its
#: capabillity and knowledge"; CHAT_PLAN.md section 4 decision 15, which
#: supersedes decision 13's naming half). An atlas is a book of maps, the thing
#: you open to find your way around a place you are already standing in, which
#: is exactly what this chat is for an app called MemoryMap. It is a name for a
#: reference work rather than for a person, so decision 13's actual objection
#: still holds: nothing here claims a personality, or to know the reader, or to
#: have read a word of their notebook.
#:
#: Every surface that says the name reads it from here or from
#: `GUIDE_NAME` in the frontend, because a persona whose name is typed out in
#: nine places is a persona with nine chances to be renamed in eight.
GUIDE_NAME = AI_NAME  # one name for the notebook's AI (INBOX 225), spelt once in ai/__init__

SYSTEM_PROMPT = (
    f"You are {GUIDE_NAME}, the in-app guide to MemoryMap, a local-first "
    "notebook. Your name is the name of a book of maps: you are a reference "
    "the person opens to find their way around the app, and you say so if "
    "asked who you are. You answer ONLY questions "
    "about how to use the MemoryMap app itself: its features, tabs, and "
    "settings. You have no access to the user's notes or documents, so if "
    "asked a question about their notebook's own content, say plainly that "
    "this chat is for app guidance only and point them to the Chat or Ask "
    "tab instead of guessing. Base your answer only on the reference notes "
    "given to you below the question, if any are given, never invent a "
    "button, setting, or feature that isn't in them. If no reference notes "
    "are given, or they don't cover the question, say plainly that you're "
    "not sure and suggest checking the Help topics above this chat instead "
    "of guessing. Keep answers short: a few sentences or a short numbered "
    "list of steps: and name the exact tab or settings section involved. "
    "Write plainly, in sentence case, with no exclamation marks and no "
    "greeting before the answer. If the person describes an error, a crash "
    "or something that does not work, add one line at the end: open "
    "Settings, then Logs, press Email it under the support bundle, and the "
    f"report goes to {SUPPORT_EMAIL} with the bundle to attach."
)

#: Kept only for anything still importing the name. The Guide no longer
#: answers with an apology when the model is off: see `offline_answer`, which
#: hands over the help text this sentence used to point at.
OFFLINE_MESSAGE = (
    f"{GUIDE_NAME} isn't available right now (the local model doesn't seem "
    "to be running): the Help topics above still work without it."
)

# One factual entry per feature area, the model's *only* source of facts
# about the app, and the same ground truth the Help accordion shows in
# `frontend/index.html`'s `#settings-help` (kept in sync by hand: there is
# no shared data file behind both, since the accordion is static HTML and
# a build step to generate it from Python would be more machinery than a
# help page has earned). `keywords` decide which entries a question pulls
# in; `badge` is the quick-access chip attached to the reply when this
# entry gets used, so "how do I set a reminder" both answers correctly and
# offers one tap into the Reminders tab.
HELP_TOPICS: list[dict] = [
    {
        "id": "capture",
        "keywords": ("capture", "note", "template", "dictate", "sketch", "improve", "proofread", "draft", "tag", "category", "categorise", "write", "compose"),
        "body": (
            "Notes tab: type into \"Capture a thought\" and Save. A local AI files "
            "it into a category and suggests tags; you can re-file or edit anytime. "
            "Use a template, dictate with the microphone icon, sketch with the "
            "palette icon, or run \"Improve\" to proofread first. \"Extract notes\" "
            "turns a block of pasted text into several AI-drafted, auto-linked notes."
        ),
        "badge": {"label": "Notes", "tab": "notes"},
    },
    {
        "id": "ask-chat",
        "keywords": ("ask", "chat", "agent", "conversation", "tool", "question", "popup agent", "everywhere"),
        "body": (
            "\"Ask your notebook\" (Notes tab) and the Chat tab both answer from "
            "saved notes, with the raw notes shown beside the answer. Agent mode "
            "(a toggle in Chat) lets the assistant use its tools to search, link, "
            "tag, organise and create, destructive actions always ask first. "
            "Conversations save and rename in the sidebar. The same agent also "
            "pops open over any tab with Ctrl/Cmd+Shift+A, so you don't have to "
            "switch to Chat first."
        ),
        "badge": {"label": "Chat", "tab": "chat"},
    },
    {
        "id": "skills",
        "keywords": ("skill",),
        "body": (
            "Skills are one-click requests shown above the chat box (e.g. "
            "\"Summarise my week\"). Built-in skills ship with the app; add your "
            "own in Settings -> Skills. A skill can use the AI's tools, so it "
            "does the work rather than just describing it."
        ),
        "badge": {"label": "Skills", "section": "skills"},
    },
    {
        "id": "graph",
        "keywords": ("graph", "concept map", "mind map", "mindmap", "network"),
        "body": (
            "The Graph tab shows notes as a force-directed map, links and threads "
            "drawn between them, plus optional AI similarity lines. Search "
            "highlights matches, dragging rearranges, and the legend toggles "
            "categories on and off. Concept maps (an authored mindmap, not the "
            "automatic graph) are made and managed from the Library."
        ),
        "badge": {"label": "Graph", "tab": "graph"},
    },
    {
        "id": "reminders",
        #: "recurring" is spelt out rather than left to the inflection rule:
        #: doubling the final consonant is exactly the kind of irregularity
        #: that rule deliberately does not guess at.
        "keywords": ("reminder", "due date", "snooze", "recur", "recurring"),
        "body": (
            "The Reminders tab groups items into Overdue / Today / Upcoming / "
            "Done. Set a priority, snooze, edit inline, or make one recurring. "
            "You can also just say \"call mum tomorrow evening\" in a note and "
            "let the AI schedule it. Notifications fire while the app is open."
        ),
        "badge": {"label": "Reminders", "tab": "reminders"},
    },
    {
        "id": "dashboard",
        "keywords": ("dashboard", "widget", "streak", "digest"),
        "body": (
            "The Dashboard is the at-a-glance home: capture streak, stats, a "
            "weekly AI digest, pinned notes, reminders, and more. Click \"Edit "
            "layout\" to show, hide and rearrange widgets; the layout is "
            "remembered per user."
        ),
        "badge": {"label": "Dashboard", "tab": "dashboard"},
    },
    {
        "id": "library",
        "keywords": ("library", "bookmark", "link shelf", "contents", "outline", "search", "find", "filter", "look for", "browse"),
        "body": (
            "The Library is everything already made, in one searchable, "
            "filterable place: notes, documents, chats, files and tags, plus "
            "Links (a bookmark shelf for websites), Contents (a hyperlinked "
            "outline of the whole notebook) and AI Skills. Sub-tabs also hold "
            "Documents, Whiteboards, and the Files & Images gallery."
        ),
        "badge": {"label": "Library", "tab": "library"},
    },
    {
        "id": "documents",
        "keywords": ("document", "editor", "markdown", "code file", "live view", "source view"),
        "body": (
            "The document editor (opened from Library -> Documents) has four "
            "views: Live (renders as you write), Source, Split and Read. Code "
            "files get line numbers, Tab/Shift+Tab indenting and Ctrl+/ "
            "commenting. \"Check with AI\" reviews a document for wording issues "
            "a spellchecker can't catch."
        ),
        "badge": {"label": "Library", "tab": "library"},
    },
    {
        "id": "whiteboard",
        "keywords": ("whiteboard", "sketch pad", "canvas", "freehand"),
        "body": (
            "The whiteboard (Library -> Whiteboards) is a pannable canvas for "
            "freehand sketches and note cards together. Freehand sketches also "
            "appear in the Library's Images sub-tab."
        ),
        "badge": {"label": "Library", "tab": "library"},
    },
    {
        "id": "files-images",
        "keywords": ("image", "photo", "caption", "ocr", "vision", "scan", "pdf", "file upload"),
        "body": (
            "Every image is read automatically, up to three ways: an AI caption "
            "of what it shows, a vision-model transcription of any text in it, "
            "and Tesseract OCR if that's installed: all editable and searchable. "
            "A scanned PDF is rasterised page-by-page and read by an OCR model "
            "(no Tesseract needed); you can pick the model or leave it automatic."
        ),
        "badge": {"label": "Library", "tab": "library"},
    },
    {
        "id": "timeline",
        "keywords": ("timeline",),
        "body": (
            "The Timeline tab lays notes out chronologically in day/week/month "
            "buckets, grid or line view, with an optional band (category, tag "
            "or space) to see how things cluster over time."
        ),
        "badge": {"label": "Timeline", "tab": "timeline"},
    },
    {
        "id": "memory",
        "keywords": ("remember", "passive capture", "auto capture", "learn about me"),
        "body": (
            "MemoryMap can pick up small facts and preferences as you write and "
            "chat, always asking first, never assumed. Accept or decline each "
            "suggestion right in the chat, and review or forget anything it has "
            "learned in Settings -> What it remembers."
        ),
        "badge": {"label": "What it remembers", "section": "memory"},
    },
    {
        "id": "spaces",
        "keywords": ("space", "workspace", "separate notebook"),
        "body": (
            "A space is a separate notebook inside the same app: notes, "
            "documents, chats and tags kept apart from other spaces. Switch or "
            "create one from the picker at the top of the sidebar; \"All "
            "spaces\" shows everything together."
        ),
        "badge": {"label": "Spaces", "section": "account"},
    },
    {
        "id": "appearance",
        "keywords": (
            "theme", "dark mode", "light mode", "accent colour", "accent color", "font",
            "density", "glass", "performance", "performance mode", "animation", "animations",
            "slow", "laggy", "blur",
        ),
        "body": (
            "Settings -> Appearance controls theme (light/dark/system), accent "
            "colour, fonts, density, glass effects and the animated background. "
            "High-contrast and reduce-motion options are there for comfort and "
            "accessibility. Performance mode (Effects & accessibility) turns off "
            "the frosted-glass blur, the animations and the animated background "
            "and slows the graph physics, for a slow or small machine; Auto "
            "switches it on by itself on a machine with 2 cores or 4 GB or fewer, "
            "and On or Off overrides that."
        ),
        "badge": {"label": "Appearance", "section": "appearance"},
    },
    {
        #: **The strip along the bottom had no entry at all** (INBOX 304). The
        #: app offers "What is the status bar telling me?" under the status
        #: bar's own '?', and the guide had nothing to answer it from: a
        #: suggestion the corpus cannot reach. Written from `STATUS_SLOTS` in
        #: `frontend/app.js` and the copy in `#statusbar-help`, which are the
        #: two places that decide what the bar actually shows.
        "id": "statusbar",
        "keywords": ("status bar", "statusbar", "bottom bar", "bottom strip", "the strip"),
        "body": (
            "The status bar is the strip along the bottom of every screen. It "
            "shows what the local model is doing, your note count, open and due "
            "reminders, back and forward, undo and redo, the Ctrl/Cmd+K hint, "
            "Ask the agent, Atlas the guide, and Find anything. The offline "
            "badge, the power-saver badge and the running-job slot appear only "
            "when there is something to say. Settings -> Appearance -> Status "
            "bar chooses which of the rest to show."
        ),
        "badge": {"label": "Appearance", "section": "appearance"},
    },
    {
        "id": "shortcuts",
        "keywords": ("shortcut", "keyboard", "hotkey", "command palette"),
        "body": (
            "Press ? for the full shortcut list, or Ctrl/Cmd+K for the command "
            "palette (jump anywhere, search notes). Press g then a letter to "
            "jump straight to a tab; Settings -> Shortcuts lists which letter "
            "goes where. There are no \"/\" chat commands to learn."
        ),
        "badge": {"label": "Shortcuts", "section": "shortcuts"},
    },
    {
        "id": "models",
        "keywords": ("model", "ollama", "lm studio", "vllm", "llama.cpp", "utility model", "chat model", "sampling", "temperature"),
        "body": (
            "Settings -> Models picks the chat model and an optional smaller "
            "utility model for background jobs. Any OpenAI-compatible server "
            "works, not just Ollama, LM Studio, llama-server, Jan, vLLM. "
            "Sampling parameters (temperature, top-p, top-k, min-p, repeat "
            "penalty) are exposed there too, starting at what the model itself "
            "recommends."
        ),
        "badge": {"label": "Models", "section": "models"},
    },
    {
        "id": "storage",
        "keywords": ("backup", "storage", "data dir", "where is my", "export", "data folder", "import", "obsidian", "vault", "migrate", "restore"),
        "body": (
            "Everything lives in a data folder you control: the notebook "
            "database, uploads, and daily local backups. Settings -> Data shows "
            "exactly where it is on disk, and lets you export as JSON, CSV or "
            "Markdown, and manage or restore backups."
        ),
        "badge": {"label": "Data", "section": "data"},
    },
    {
        "id": "websearch",
        "keywords": ("web search", "websearch", "internet search", "searxng", "search the web", "search online", "look it up online"),
        "body": (
            "Web search is opt-in and off by default. When turned on in "
            "Settings -> Web search, only your search words are sent out, "
            "never your notes: so the assistant can look something up online "
            "when asked."
        ),
        "badge": {"label": "Web search", "section": "websearch"},
    },
    {
        "id": "privacy",
        "keywords": ("private note", "encrypt", "password", "lock", "security", "offline", "online", "internet", "cloud", "telemetry", "tracking"),
        "body": (
            "Private notes are encrypted at rest with a key derived from your "
            "unlock password. The app binds to localhost, has no account or "
            "telemetry, and nothing leaves your machine unless you explicitly "
            "turn on web search."
        ),
        "badge": {"label": "Account & security", "section": "account"},
    },
    {
        "id": "archive",
        "keywords": ("archive", "archived", "shelved", "out of the way"),
        "body": (
            "Archiving keeps a note, chat or document but gets it out of your "
            "everyday lists: different from the bin, since nothing archived "
            "is ever auto-cleared or at risk of being deleted. The action is "
            "in each item's own menu (next to Delete, not grouped with it); "
            "everything archived is still reachable from the Library's "
            "Archived filter, where Unarchive brings it straight back."
        ),
        "badge": {"label": "Library", "tab": "library"},
    },
    {
        "id": "undo-bin",
        "keywords": ("undo", "redo", "recycle bin", "restore", "deleted", "trash"),
        "body": (
            "Deleting a note goes to the recycle bin, not gone for good, "
            "restore it from the Library's Bin filter, or use the Undo toast "
            "that appears right after deleting. Ctrl/Cmd+Z undoes the last "
            "change generally; the status bar's own Undo/Redo buttons do the "
            "same thing by click."
        ),
        "badge": {"label": "Library", "tab": "library"},
    },
    {
        "id": "voice",
        "keywords": ("dictate", "dictation", "voice", "microphone", "meeting", "transcribe", "recording", "read aloud"),
        "body": (
            "The microphone icon on the note composer dictates a note using "
            "local Whisper: nothing sent anywhere. \"Record a meeting or "
            "lecture\" (reachable from the Dashboard or the command palette) "
            "transcribes a longer recording and can pull out decisions and "
            "action items. Read-aloud plays a note or answer back to you."
        ),
        "badge": {"label": "Notes", "tab": "notes"},
    },
    {
        "id": "autonomous",
        #: The last three are the words a person uses for this rather than the
        #: name the feature has: "what can it change on its own" is the
        #: question, and it used to reach the entry about Atlas instead,
        #: because it names Atlas and nothing else matched (INBOX 304).
        "keywords": (
            "background librarian", "auto tag", "auto-tag", "auto link",
            "auto-link", "dedupe", "duplicate", "autonomous",
            "on its own", "by itself", "without me",
        ),
        "body": (
            "Turned on in Settings -> Preferences, the background librarian "
            "tags, links and flags duplicate notes on an interval you choose "
            ", off by default, since it writes to your notebook without "
            "being asked each time. It never deletes anything and skips "
            "itself on battery power."
        ),
        "badge": {"label": "Preferences", "section": "preferences"},
    },
    {
        #: **The guide's entry about itself** (INBOX 204: "improve its
        #: capabillity and knowledge"). The one question every chat is asked
        #: first, "what are you, and what can you do", was the one question
        #: this one had no reference note for: with no topic matched the
        #: prompt tells the model to say it is not sure, so the guide
        #: answered "I'm not sure" when asked what it was. Its own name is a
        #: keyword because a person who has just read "Atlas" at the top of
        #: the sheet will type it.
        "id": "guide",
        "keywords": (
            "atlas", "guide", "who are you", "what are you", "your name",
            "yourself", "what can you do", "what do you do",
            #: The exact words under this panel's own '?' (`ATLAS_PROMPTS`,
            #: "help-chat-help"). A suggestion the corpus cannot answer is the
            #: worst kind of dead end, which is why
            #: `test_every_question_the_app_offers_to_ask_atlas_is_answerable`
            #: now reads that table against this one (INBOX 304).
            "what can you help", "help me with",
        ),
        "body": (
            "Atlas is this app's in-app guide, named for a book of maps. It "
            "answers how-to questions about MemoryMap itself from the app's "
            "own help: where a feature lives, what a setting does, which tab "
            "to be on. It answers on the utility model in Settings -> Models "
            "while smart model routing is on, on the chat model while that is "
            "off, and Settings -> Models can give the guide a model of its "
            "own. It cannot read your notes or documents (ask the "
            "Chat or Ask tab for those), and nothing said to it is saved: the "
            "conversation is gone on reload, and \"New chat\" clears it now. "
            "It is reachable from the status bar on every tab, from the head "
            "of every Settings pane, and from Settings -> Help."
        ),
        "badge": {"label": "Help", "section": "help"},
    },
    {
        "id": "command-palette",
        "keywords": ("command palette", "jump anywhere", "quick actions", "jump to"),
        "body": (
            "Ctrl/Cmd+K opens the command palette: jump to any tab or "
            "setting, search notes, or run a quick action (new note, new "
            "chat, back up now, toggle the theme, and more) without leaving "
            "the keyboard. It's a different box from the popup agent "
            "(Ctrl/Cmd+Shift+A): this one runs fixed commands, that one "
            "answers and acts on an open-ended request."
        ),
        "badge": {"label": "Shortcuts", "section": "shortcuts"},
    },
    {
        "id": "extract-notes",
        "keywords": ("extract notes", "rough thoughts", "writing room", "draft"),
        "body": (
            "\"Extract notes\" (Notes tab) turns a block of pasted free text "
            "into several AI-drafted, auto-linked notes instead of one long "
            "one. The Writing Room sub-tab is for turning rough, unstructured "
            "thoughts into a proper note before it's saved."
        ),
        "badge": {"label": "Notes", "tab": "notes"},
    },
    {
        "id": "favourites",
        "keywords": ("favourite", "favorite", "star", "starred", "pin", "pinned"),
        "body": (
            "Starring a note makes it a favourite, a parallel way to keep "
            "important notes close, separate from categories or tags. "
            "Favourites show in the sidebar, filter in the Library, and can "
            "sit in their own Dashboard widget."
        ),
        "badge": {"label": "Notes", "tab": "notes"},
    },
    #: **Five topics added after an audit against what the app can actually
    #: do.** Asked for directly: "did you make sure full usage guides exist in
    #: the docs for the help ai to use??" The answer was mostly yes, every tab
    #: had an entry: but the checker found five features the help AI could not
    #: describe at all, which means it would have guessed. A help assistant that
    #: guesses is worse than one that says it does not know, so anything it can
    #: be asked about needs an entry here.
    {
        "id": "ocr-workspace",
        "keywords": (
            "ocr", "read text", "scan", "scanned", "extract text", "transcribe",
            "tesseract", "vision model", "page read", "pdf text",
        ),
        "body": (
            "OCR workspace: open any image or PDF from the Library or a note and "
            "choose \"Read text\". Pick the reader at the top, the AI document "
            "reader (a model built to transcribe a page), the general vision "
            "model where you have a different one installed, or Tesseract, which "
            "needs no model, is about ten times faster and is the only reader "
            "that tells you where on the page each block sits. Read one page, a "
            "range like 1-5, or the whole document. A read keeps running if you "
            "close the window: it shows in Settings -> Background tasks and can "
            "be stopped from there or from the workspace, and every page that "
            "has been read is remembered, so reopening the document shows the "
            "text again rather than starting over."
        ),
        "badge": {"label": "Library", "tab": "library"},
    },
    {
        "id": "document-history",
        "keywords": (
            "history", "version", "revision", "restore", "undo edit", "previous version",
            "git log", "rollback", "ai edit log", "old version", "earlier version",
            "what it used to say", "roll back",
        ),
        "body": (
            "Documents keep a history. The ... menu -> History lists every "
            "version the document has had, newest first, with who changed it "
            "(you, an AI edit, or a restore), how many words it gained or lost, "
            "and the opening of that version. \"View\" reads an old version "
            "without changing anything; \"Restore\" puts it back and keeps the "
            "version it replaced, so a restore is itself undoable. A stretch of "
            "editing counts as one entry rather than one per autosave. The AI "
            "panel has a separate \"AI edits\" log for reverting one specific "
            "suggestion the model made."
        ),
        "badge": {"label": "Documents", "tab": "documents"},
    },
    {
        "id": "writing-checks",
        "keywords": (
            "spelling", "spellcheck", "suggestion", "proofread", "grammar",
            "dictionary", "rephrase", "wording", "autocorrect", "flagged",
        ),
        "body": (
            "The document editor checks spelling, spacing and sentence length as "
            "you write. In Live view a flagged word is underlined: click or "
            "right-click it for corrections, \"Add to dictionary\" or \"Ignore "
            "this for now\". The Suggestions panel lists every finding; clicking "
            "one scrolls to it and highlights it briefly. Where there is no "
            "mechanical fix, an awkward sentence, \"Ask the AI for wordings\" "
            "has the local model offer two or three alternatives to pick from. "
            "Nothing is changed until you choose it. Manage the dictionary and "
            "the British/American spelling preference from the editor's own "
            "dictionary dialog."
        ),
        "badge": {"label": "Documents", "tab": "documents"},
    },
    {
        "id": "notebook-questions",
        "keywords": (
            "how many", "most common", "statistics", "stats", "count", "top tags",
            "busiest", "untagged", "orphan", "most linked",
        ),
        "body": (
            "You can ask about the notebook itself, not just what is in it: "
            "\"what are my most common tags\", \"which categories have the most "
            "notes\", \"how many notes do I have\", \"how many notes have no "
            "tags\", \"which are my most linked notes\", \"when do I write "
            "most\". These are counted from your data rather than generated, so "
            "the numbers are exact, the answer is instant, and it works even "
            "with no AI model running at all. Private and binned notes are never "
            "counted."
        ),
        "badge": {"label": "Chat", "tab": "chat"},
    },
    {
        "id": "contradictions",
        "keywords": (
            "contradict", "contradiction", "tension", "disagree", "conflict",
            "inconsistent", "changed my mind", "out of date",
        ),
        "body": (
            "MemoryMap can look for places where two of your notes disagree, a "
            "decision you reversed, a fact you later corrected, and show them "
            "side by side with the dates, so you can see which is current. It "
            "runs on demand rather than constantly, because it is a real pass "
            "over the notebook with the local model. It never edits anything: "
            "the point is to show you the pair and let you decide."
        ),
        "badge": {"label": "Dashboard", "tab": "dashboard"},
    },
]

#: A tight window: this is guidance, not a conversation to reminisce in.
MAX_HISTORY_TURNS = 6
MAX_MESSAGE_CHARS = 1000
#: **Where the question was asked from** (INBOX 190: "maybe give it more
#: knowledge and capabilitie/function"). The Guide is reachable from every tab
#: now, so "how do I do this" is asked with something specific on screen, and
#: until this it answered as though the question had arrived from nowhere.
#: A tab pulls in its own topics whether or not the question names them, which
#: is what lets "how does this work?" on the Graph tab be a question about the
#: graph. The ids are `HELP_TOPICS` ids; a tab with no entry simply adds
#: nothing, which is the correct behaviour for a surface the topics do not
#: cover yet.
TAB_TOPICS: dict[str, tuple[str, ...]] = {
    "dashboard": ("dashboard",),
    "notes": ("capture", "memory"),
    "chat": ("ask-chat", "skills"),
    "graph": ("graph",),
    "library": ("library", "files-images", "whiteboard"),
    "documents": ("documents",),
    "timeline": ("timeline",),
    "reminders": ("reminders",),
}

#: How much of the surface's own help copy the client may send with a
#: question. The caller passes the `.help-body` text of whatever is on screen
#: (frontend/settings.js), which is the app's own wording for the thing being
#: asked about and therefore the best possible reference note: it is also
#: user-supplied input on the wire, so it is capped here rather than trusted
#: to have been capped there.
MAX_CONTEXT_CHARS = 1200

#: How many reference entries to hand the model for one question. Kept
#: small on purpose: item 40 asked for "a tight prompt/context budget",
#: and a guidance answer is about one or two features, not a syllabus.
MAX_TOPICS = 3


# Whole-word match, not a raw substring one, a plain `in` check let "ask"
# match inside "basket" and "task", and a wrongly-matched topic means the
# model gets handed reference notes about the wrong feature. Compiled once
# at import time rather than per call: this runs on every `/help/ask`
# request, and re-compiling ~100 small regexes (18 topics x ~6 keywords)
# on every one of them is wasted work an unbounded local model call already
# dwarfs, but costs nothing to avoid.
#
# **Whole word, but not one single form of the word** (INBOX 304, the owner:
# "the help bot is useless, or the suggested questions are bad or both"). He
# asked "Where do reminders live?" and was told the guide was not sure, with
# Notes and What it remembers named as its sources. The reminders entry was
# in this table the whole time: the keyword is "reminder", the pattern was
# `\breminder\b`, and the plural he typed does not match it. Nothing matched,
# so the tab's own topics filled in, and a question about reminders was
# answered from the notes and memory entries. Every plural in the app had the
# same hole: "documents", "notes", "spaces", "backups". The keyword table is
# written in the singular by anyone adding to it, and people ask in whichever
# number reads naturally, so the number is handled here once rather than by
# asking thirty entries to list both forms and catching the next one late.
#
# A fixed set of inflections, not a stemmer: "-s", "-es" and the possessive,
# plus "-y" to "-ies" for a keyword like "library". Anything less regular
# ("recur" to "recurring") is spelt out in the keyword tuple, where it can be
# read, rather than guessed at by a rule loose enough to match it.


def _keyword_pattern(keyword: str) -> re.Pattern[str]:
    if len(keyword) > 3 and keyword.endswith("y") and keyword[-2] not in "aeiou":
        stem = re.escape(keyword[:-1]) + "(?:y|ies)"
    else:
        stem = re.escape(keyword) + "(?:es|'s|s)?"
    return re.compile(rf"\b{stem}\b")


_KEYWORD_PATTERNS: dict[str, re.Pattern[str]] = {
    keyword: _keyword_pattern(keyword)
    for topic in HELP_TOPICS
    for keyword in topic["keywords"]
}


def _matching_topics(question: str) -> list[dict]:
    """Which `HELP_TOPICS` entries this question is actually about, ranked by
    how much of a topic's vocabulary it mentions. Ties keep `HELP_TOPICS`
    order, so the more commonly-asked-about features (listed first) win a tie
    over a rarer one.

    **A phrase counts for its words, not for one.** This used to score one per
    matching keyword, which makes "search" and "web search" equally strong
    evidence, and the generic one always belongs to the more commonly-asked
    topic that sits earlier in the list. Measured 2026-09-21, the moment
    "search" was added to the Library's keywords so that "how do I search my
    notes" would stop being answered by the capture box: "can it search the
    web" started answering with the Library, and "how do I turn on web search"
    put the Library first. Both were one-against-one ties broken by list
    order.

    Weighting a keyword by its own word count is the smallest rule that says
    what is actually true: somebody who typed two particular words in a row
    has told you more than somebody who typed one common one. "web search"
    now scores 2 against "search"'s 1 and wins on the merits rather than on
    where it happens to sit in the table."""
    lowered = question.lower()
    scored = [
        (
            sum(
                len(keyword.split())
                for keyword in topic["keywords"]
                if _KEYWORD_PATTERNS[keyword].search(lowered)
            ),
            topic,
        )
        for topic in HELP_TOPICS
    ]
    scored = [pair for pair in scored if pair[0] > 0]
    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [topic for _, topic in scored[:MAX_TOPICS]]


#: **Which help topics an answer was built from, in words** (INBOX 224: "a
#: scrolling transcript in bubbles with the source help topic under each
#: answer"). The badge beside an answer names where to *go* ("Reminders", the
#: tab); this names where the answer came *from*, which is a different claim
#: and the one that makes the answer checkable: the same topic is on the Help
#: page in full.
#:
#: The name is derived from the id rather than added as a thirty-second field
#: per topic. The ids are already written as words with hyphens between them
#: ("command-palette", "files-images"), so one rule here reads better than
#: thirty-one hand-written titles that can disagree with the ids beside them.
def source_names(topics: list[dict]) -> list[str]:
    return [topic["id"].replace("-", " ").capitalize() for topic in topics]


def badges_for(topics: list[dict]) -> list[dict]:
    """The quick-access chips for a set of matched topics, de-duplicated by
    label and capped: same cap as `MAX_TOPICS`, since each matched topic
    contributes at most one badge."""
    seen: set[str] = set()
    out: list[dict] = []
    for topic in topics:
        badge = topic["badge"]
        if badge["label"] not in seen:
            out.append(badge)
            seen.add(badge["label"])
    return out


def topics_for(question: str, tab: str | None = None) -> list[dict]:
    """The reference entries for one question, asked from one tab.

    What the question names wins outright. The tab's own topics are a
    fallback for a question that names nothing, and they are what makes "how
    does this work?" answerable at all: with no keyword in it, that question
    matched nothing and the model was told to say it was not sure.

    **A fallback, not a supplement** (INBOX 304). They used to be appended to
    whatever the question matched, up to `MAX_TOPICS`, so a question asked
    from the Notes tab was grounded in the notes and memory entries however
    clearly it named its own subject, and the answer printed Notes and What it
    remembers as its sources. Two thirds of the reference material was then
    about something the person had not asked about, on a small local model
    with a 256-token reply: the wrong entries do not sit there politely, they
    are what the model answers from. The tab is still on the prompt as a line
    of its own ("the person asking has the notes tab open"), which is the part
    of the context that was worth having.
    """
    topics = _matching_topics(question)
    if not tab or topics:
        return topics
    seen = {topic["id"] for topic in topics}
    by_id = {topic["id"]: topic for topic in HELP_TOPICS}
    for topic_id in TAB_TOPICS.get(tab, ()):
        if len(topics) >= MAX_TOPICS:
            break
        if topic_id in seen or topic_id not in by_id:
            continue
        topics.append(by_id[topic_id])
        seen.add(topic_id)
    return topics


def _prompt_for(
    question: str,
    history: list[dict] | None,
    tab: str | None,
    context: str | None,
) -> tuple[list[dict], list[dict]]:
    """The messages one turn sends, and the topics they were built from.

    Split out of `answer` so the streamed turn cannot build a different
    prompt from the one-shot turn: the two differ only in how the reply
    comes back, and a second copy of this is how a fix to one surface's
    grounding quietly misses the other.
    """
    topics = topics_for(question, tab)
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if tab:
        messages.append(
            {
                "role": "system",
                "content": (
                    f"The person asking has the {tab} tab open. Prefer the answer "
                    "that applies to what is in front of them, and say which tab "
                    "or setting anything else is on."
                ),
            }
        )
    if topics:
        reference = "\n".join(f"- {topic['body']}" for topic in topics)
        messages.append(
            {"role": "system", "content": f"Reference notes for this question:\n{reference}"}
        )
    on_screen = (context or "").strip()[:MAX_CONTEXT_CHARS]
    if on_screen:
        messages.append(
            {
                "role": "system",
                "content": (
                    "The app's own help text for what is on screen right now, "
                    "which you may answer from as well:\n" + on_screen
                ),
            }
        )
    for turn in (history or [])[-MAX_HISTORY_TURNS:]:
        role = turn.get("role")
        content = (turn.get("content") or "").strip()
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content[:MAX_MESSAGE_CHARS]})
    messages.append({"role": "user", "content": question})
    return messages, topics


#: **The Guide, with no model running.**
#:
#: Asked for directly: *"I want to maximise the ability and function of all
#: the application features without ai, the ai features should just be the
#: bonus"*, and then again for this surface by name.
#:
#: The Guide is the one AI feature that never needed a model to be useful. Its
#: entire knowledge of this app is `HELP_TOPICS` above: one hand-written
#: paragraph per feature area, which is also the model's *only* source of
#: facts when a model does answer. `topics_for` picks the right ones from the
#: question and the tab, by keyword, with no inference anywhere in it. So with
#: no model the honest answer is not "I am not available": it is those
#: paragraphs, unedited, which is most of what the model would have said to
#: begin with.
#:
#: What is lost without the model is real and is not hidden: the paragraphs
#: are not rewritten to fit the question, several may arrive when one would
#: have done, and a question the keywords do not reach gets nothing. The reply
#: says so in its first line rather than passing this off as an answer
#: composed for the asker.
OFFLINE_LEAD = (
    "The local model is not running, so this is the app's own help text for "
    "what you asked about, word for word rather than written for your "
    "question."
)

OFFLINE_NOTHING_MATCHED = (
    "The local model is not running, and nothing in the app's own help text "
    "matches that. Try a word from the feature's own name, a tab name, or "
    "open Settings, Help, which lists every topic."
)


def offline_answer(
    question: str,
    tab: str | None = None,
    context: str | None = None,
) -> dict:
    """The same shape `answer` returns, composed without a model.

    `content`, `badges` and `sources` all come from the matched topics, so an
    offline reply carries the same quick-access chips and the same named
    sources an online one does: the chips are what turn "reminders live on the
    Reminders tab" into a way to get there, and they are exactly as true with
    the model off.
    """
    question = (question or "").strip()[:MAX_MESSAGE_CHARS]
    topics = topics_for(question, tab) if question else []
    if not topics:
        #: The app's help text for whatever is on screen, when there is any:
        #: a question this could not place is still a question asked *from
        #: somewhere*, and that somewhere describes itself.
        on_screen = (context or "").strip()[:MAX_CONTEXT_CHARS]
        if on_screen:
            return {
                "content": f"{OFFLINE_LEAD}\n\n{on_screen}",
                "badges": [],
                "sources": [],
            }
        return {"content": OFFLINE_NOTHING_MATCHED, "badges": [], "sources": []}
    body = "\n\n".join(topic["body"] for topic in topics)
    return {
        "content": f"{OFFLINE_LEAD}\n\n{body}",
        "badges": badges_for(topics),
        "sources": source_names(topics),
    }


def answer_stream(
    question: str,
    model_manager: ModelManager,
    ollama: Provider,
    history: list[dict] | None = None,
    tab: str | None = None,
    context: str | None = None,
) -> Iterator[dict]:
    """The same turn, streamed.

    Reported: the Guide's reply "will be blurted out really fast like it isnt
    streaming but just outputting at once", and its thinking "only shows up
    after the response is finished". Both were true and neither was a bug in
    the client: `/help/ask` answered in one piece after the whole reply had
    been generated, and the panel faked the writing with a timer, which is
    why it ran at a speed no model types at and why the thinking could not
    appear until there was nothing left to wait for.

    Yields `{"type": "thinking"|"delta", "text": str}` as the model produces
    them and one closing `{"type": "done", ...}` carrying the badges and
    sources, which are known before the first token but are sent last so the
    client has one place to finish a turn.
    """
    question = question.strip()[:MAX_MESSAGE_CHARS]
    if not question:
        yield {"type": "done", "content": "", "badges": [], "sources": []}
        return
    if not ollama.is_running():
        #: Not a canned apology: the app's own help text for what was asked,
        #: with the same chips and sources an answered turn carries. See
        #: `offline_answer`.
        offline = offline_answer(question, tab, context)
        yield {"type": "delta", "text": offline["content"]}
        yield {"type": "done", **offline}
        return

    messages, topics = _prompt_for(question, history, tab, context)
    pieces: list[str] = []
    #: `GUIDE_MODE` rather than `"quick"`: same brevity, same temperature,
    #: but thinking is not turned off, so the `thinking` events below are
    #: events that can actually happen. Under `"quick"` this loop's
    #: `thinking_delta` branch had never once run on a real backend.
    for piece in ollama.chat_stream(
        model_manager.utility_model(), messages, mode=presets.GUIDE_MODE
    ):
        thinking = piece.get("thinking_delta")
        if thinking:
            yield {"type": "thinking", "text": thinking}
        delta = piece.get("content_delta")
        if delta:
            pieces.append(delta)
            yield {"type": "delta", "text": delta}
    content = "".join(pieces).strip()
    yield {
        "type": "done",
        "content": content,
        "badges": badges_for(topics),
        "sources": source_names(topics),
    }


def answer(
    question: str,
    model_manager: ModelManager,
    ollama: Provider,
    history: list[dict] | None = None,
    tab: str | None = None,
    context: str | None = None,
) -> dict:
    """One turn of the help chat.

    `history` is whatever the caller is holding client-side for the current
    session (see module docstring): never read from or written to the
    database. `tab` is the surface the question was asked from and `context`
    that surface's own help copy, both optional and both only ever used to
    choose and extend the reference notes. Returns
    `{"content": str, "badges": list[dict]}`."""
    question = question.strip()[:MAX_MESSAGE_CHARS]
    if not question:
        return {"content": "", "badges": [], "sources": []}
    if not ollama.is_running():
        return offline_answer(question, tab, context)

    messages, topics = _prompt_for(question, history, tab, context)
    #: Still `"quick"`, not `GUIDE_MODE`: this is the one-shot fallback, taken
    #: only when a stream could not be opened, and it returns one object at the
    #: end. There is nowhere for thinking to be shown on this path, so paying
    #: a reasoning model to produce it would buy the reader nothing but a wait.
    reply = ollama.chat(model_manager.utility_model(), messages, mode="quick")
    content = reply["content"].strip()
    return {
        "content": content,
        "badges": badges_for(topics),
        "sources": source_names(topics),
    }
