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

import math
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
        #: Every chord in `DEFAULT_SHORTCUTS` (frontend/app.js) is named here,
        #: which `tests/test_help_controls.py` checks against the table, so a
        #: new shortcut fails the build until the guide can answer for it. It
        #: said "g then a letter" until INBOX 410: the chord had been "m" for
        #: months, and the guide was the one place still teaching the old key.
        "body": (
            "Press ? for the full list; Settings -> Shortcuts rebinds any of "
            "them, and on a Mac Cmd works in place of Ctrl. Everywhere: Ctrl+K "
            "the command palette, Ctrl+P find anything, Ctrl+F find on this "
            "page, / jump to search (the chat box on Chat), Ctrl+Z undo, "
            "Ctrl+Shift+Z redo, Alt+Left and Alt+Right back and forward, Ctrl+, "
            "settings, Ctrl+Shift+L light or dark, Ctrl+Alt+R reload clearing "
            "cached files. Make: Ctrl+Shift+N a new note, Ctrl+Shift+D a new "
            "document, Ctrl+D today's note, Ctrl+Shift+R record a meeting, "
            "Ctrl+Shift+K the quick sketch pad, Ctrl+Shift+B the whiteboard. "
            "Writing: Ctrl+S save, Ctrl+/ the blocks and commands menu (in a "
            "document it comments the line instead), Ctrl+J Atlas writes at the "
            "cursor, Ctrl+Shift+E actions for the selected text. AI: "
            "Ctrl+Shift+A the popup agent, Ctrl+Shift+H ask Atlas about the app, "
            "Ctrl+Shift+O a new chat, Ctrl+Shift+G agent mode on or off, Ctrl+. "
            "stop the answer, Ctrl+Shift+P clip a note to your next question. "
            "Press m then a letter to jump to a tab; the hint that appears shows "
            "which letter goes where."
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
            "you write, and grammar (agreement, a or an, its or it's) with Harper, "
            "a grammar checker that runs on this computer; note boxes get the "
            "grammar check too, and the dictionary dialog turns it off. It also "
            "checks accessibility: a skipped heading level, an image with no "
            "description, link text like \"click here\". In Live "
            "view a flagged word is underlined: click or "
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

#: **The vocabulary people actually use, and the topics they asked about that
#: had none** (INBOX 406, measured on `tests/fixtures/help_questions.json`).
#: Kept as edits beside the table rather than rewritten into it, so each
#: entry above still reads as it was written and this block says what the
#: question bank taught: words moved to the topic they name (a note's tags
#: are filing, not capturing), generic words taken off topics they pulled
#: every question towards ("note", "atlas"), and the ways people phrase a
#: thing ("talk to the ai", "pictures", "journal") added where they belong.
_KEYWORDS_ADD: dict[str, tuple[str, ...]] = {
    "capture": ("take notes", "take a note", "make notes", "write notes", "new note", "quick note", "quick thought", "write a note", "make a note", "jot", "without filing", "save a note"),
    "ask-chat": ("talk to", "citation", "cite", "sources", "answer from my notes", "ask atlas", "chat with"),
    "skills": ("automate", "automation", "reorganise", "reorganize", "reorganising", "reorganizing", "workflow", "routine"),
    "graph": ("see how", "visualise", "visualize", "unlinked", "dotted line", "connections map"),
    "reminders": ("remind", "remind me", "due", "alarm"),
    "dashboard": ("home", "home page", "start page", "compact", "rearrange", "numbers on the dashboard"),
    "library": ("all my files", "old chat", "chats", "everything i have", "my files"),
    "whiteboard": ("board", "draw", "drawing", "sticky", "sticky note", "pen", "infinite canvas"),
    "files-images": ("picture", "pic", "attach", "attachment", "upload"),
    "timeline": ("journal", "diary", "daily note", "today's note", "last month", "last week", "what i wrote"),
    "memory": ("forget", "remembers", "about me"),
    "spaces": ("separate", "work and personal", "personal notes", "different notebooks"),
    "statusbar": ("dot", "bottom corner", "at the bottom"),
    "models": ("ai model", "llm", "connect a model", "turn off the ai", "without the ai", "no ai", "local model", "which model"),
    "storage": ("where is my data kept", "back up", "disk space", "disk", "where is my data", "data stored", "export everything", "move my notes"),
    "websearch": ("internet", "web", "google", "browse the web", "search the internet", "search online"),
    "privacy": ("private", "leave my computer", "data leave", "sent anywhere", "privacy", "spy"),
    "undo-bin": ("delete", "by mistake", "bin", "get back", "recover"),
    "voice": ("speak", "speech", "record", "meeting notes"),
    "autonomous": ("background", "automatically", "overnight"),
    "command-palette": ("ctrl k", "commands"),
    "extract-notes": ("pull notes out", "split into notes", "from a chat", "out of a chat"),
    "document-history": ("older version",),
    "ocr-workspace": ("scan a document", "scan a page", "read a scan"),
    "writing-checks": ("spell",),
    "guide": ("what is atlas", "who is atlas"),
}

_KEYWORDS_REMOVE: dict[str, tuple[str, ...]] = {
    "capture": ("note", "tag", "category", "categorise", "template", "dictate", "write"),
    "graph": ("mind map", "mindmap"),
    "library": ("search", "find", "filter", "look for"),
    "privacy": ("password", "lock", "private note", "encrypt", "security"),
    "appearance": ("slow", "laggy"),
    "guide": ("atlas",),
    "storage": ("where is my",),
}

for _topic in HELP_TOPICS:
    _drop = set(_KEYWORDS_REMOVE.get(_topic["id"], ()))
    _topic["keywords"] = tuple(k for k in _topic["keywords"] if k not in _drop) + tuple(
        k for k in _KEYWORDS_ADD.get(_topic["id"], ()) if k not in _topic["keywords"]
    )

HELP_TOPICS.extend(
    [
        {
            "id": "write-with-atlas",
            "keywords": (
                "write for me", "write with atlas", "writing room", "draft a note",
                "rewrite", "continue the draft", "bullets to prose", "prose to bullets",
                "write an essay", "write an email", "draft",
            ),
            "body": (
                "Notes tab, Write with Atlas: pick what to write (draft a note, "
                "continue or rewrite the draft, bullets to prose, prose to bullets, "
                "or translate), add notes as sources if you want it grounded in "
                "them, and press Write. The draft stays in the box to edit; save it "
                "as a note when it reads right. Which model writes is set on the "
                "same row, or in Settings, Models."
            ),
            "badge": {"label": "Write with Atlas", "tab": "notes"},
        },
        {
            "id": "security",
            "keywords": ("password", "lock", "locked", "lock screen", "security", "sign in", "log in", "private note", "encrypt", "forgot password", "idle"),
            "body": (
                "Settings, Account and security: set a password and the notebook "
                "asks for it when it opens. The lock button in the top bar locks it "
                "now, and it locks itself after the idle time you choose there. "
                "Private notes are encrypted with that password and are never sent "
                "to the AI. There is no reset without the password, so keep it safe."
            ),
            "badge": {"label": "Account & security", "section": "account"},
        },
        {
            "id": "search",
            "keywords": ("search", "find", "find anything", "look for", "filter", "where did", "locate", "ctrl p", "operator", "search my notes"),
            "body": (
                "Find anything (Ctrl+P, or the search box on the dashboard) looks "
                "through notes, documents, boards, files, links and reminders at "
                "once, by your words and by meaning, and the chips narrow it to one "
                "kind. You can type operators: tag:work, kind:document, before:2026-01, "
                "has:image, and -word to leave something out. To narrow only the "
                "notes list, use Filter notes on the Your notes tab."
            ),
            "badge": {"label": "Notes", "tab": "notes"},
        },
        {
            "id": "links",
            "keywords": ("link", "linked", "linking", "connect", "connection", "backlink", "wiki link", "link two notes", "related notes"),
            "body": (
                "Link one note to another by typing [[ and the start of its title, "
                "then picking it from the list. The link shows on both notes as a "
                "connection, with a menu to add a reason, open or remove it. Atlas "
                "also suggests links as you write, and every note's menu has Link "
                "to. The Graph draws all of them."
            ),
            "badge": {"label": "Notes", "tab": "notes"},
        },
        {
            "id": "troubleshooting",
            "keywords": ("not working", "isnt working", "doesnt work", "broken", "error", "no model", "cant connect", "cannot connect", "stuck", "crash", "fails", "logs", "not answering", "isnt answering", "not replying", "doesnt answer", "get an error"),
            "body": (
                "If Atlas does not answer, open Settings, Models: it says whether a "
                "model is connected. Start Ollama (or LM Studio, or a llama.cpp "
                "server), pick a model and press Connect. Everything except Chat, "
                "drafting and skills works without one, and Notes, Ask answers from "
                "your notes. Settings, Logs shows the last errors, which is what to "
                "send if you report a problem."
            ),
            "badge": {"label": "Models", "section": "models"},
        },
        {
            "id": "performance",
            "keywords": ("slow", "laggy", "lag", "memory usage", "ram", "cpu", "speed up", "freeze", "freezes"),
            "body": (
                "If the app feels slow, turn on Performance mode in Settings, "
                "Appearance: it switches off the glass, the background art and most "
                "animation. The built-in search engine uses about 650 MB of memory "
                "while the app is open; choosing Ollama's nomic-embed-text for "
                "embeddings in Settings, Models keeps MemoryMap itself near 100 MB."
            ),
            "badge": {"label": "Appearance", "section": "appearance"},
        },
        {
            "id": "tour",
            "keywords": ("tour", "guided tour", "walkthrough", "onboarding", "tutorial", "show me around", "getting started", "learn the app", "new here"),
            "body": (
                "The guided tour walks through the whole app a section at a time, "
                "pointing at the real controls. Start it from Settings, Help and "
                "guide. Each section's own button starts there and carries on to the "
                "next; Back and Next move through it, and Finish ends it whenever you "
                "like."
            ),
            "badge": {"label": "Help", "section": "help"},
        },
        {
            "id": "personas",
            "keywords": ("persona", "personality", "sound like", "sounds like", "character", "coach", "analyst", "voice of atlas", "change atlas"),
            "body": (
                "A persona changes how Atlas talks, not what it knows: answers stay "
                "grounded in your notes whichever one is active. Pick one in the "
                "Chat tab; edit the built-ins or write your own in Settings, "
                "Personas, where {ai_name} in your text becomes Atlas's name."
            ),
            "badge": {"label": "Personas", "section": "personas"},
        },
        {
            "id": "translate",
            "keywords": ("translate", "translation", "translator", "language", "another language", "spanish", "french", "german", "chinese", "japanese"),
            "body": (
                "Write with Atlas translates: put the text in the box and press "
                "Translate, or pick a language under Translate into in the menu "
                "beside Draft. The local model keeps every fact, name, number and "
                "the markdown, and leaves code and links alone. It needs a model "
                "connected."
            ),
            "badge": {"label": "Notes", "tab": "notes"},
        },
        {
            "id": "templates",
            "keywords": ("template", "templates", "preset", "layout", "meeting template", "journal template", "reuse"),
            "body": (
                "Capture has templates: pick one from No template above the box and "
                "the note starts with its outline. Save your own from Settings, "
                "Templates. A new document offers its own gallery of templates too."
            ),
            "badge": {"label": "Templates", "section": "templates"},
        },
        {
            "id": "tags-categories",
            "keywords": ("tag", "tagging", "category", "categories", "categorise", "categorize", "filing", "file a note", "file my notes", "files my notes", "refile", "move to category", "rename category", "organise"),
            "body": (
                "Atlas files each note into a category and suggests tags. Change "
                "either from the note's own row (press the category or Add tags), or "
                "choose a category yourself in Capture's Filing menu. The categories "
                "are the sidebar of Your notes. Settings, Skills has Reorganise my "
                "categories and Clean up my tags for a bigger tidy."
            ),
            "badge": {"label": "Notes", "tab": "notes"},
        },
        {
            "id": "updates",
            "keywords": ("update", "updates", "upgrade", "new version", "latest version", "release", "changelog", "auto update", "version"),
            "body": (
                "Settings, About says which version you have and checks for a newer "
                "one; the Windows app can download and install it for you. Choose "
                "Stable (releases only) or Main. A copy started with start.sh or "
                "start.bat updates itself when it starts, following the same "
                "setting, and turning automatic updates off stops it."
            ),
            "badge": {"label": "About", "section": "about"},
        },
        {
            "id": "notifications",
            "keywords": ("notification", "bell", "alert", "unread", "pop up", "popup"),
            "body": (
                "The bell in the top bar collects what happened while you were "
                "busy: reminders coming due, background jobs that finished, and "
                "Atlas's suggestions. The number on it is what you have not seen. "
                "Reminders also pop up on their own while the app is open."
            ),
            "badge": {"label": "Dashboard", "tab": "dashboard"},
        },
        {
            "id": "code-files",
            "keywords": ("code", "coding", "programming", "python", "javascript", "syntax", "format code", "comment out", "emmet", "html", "css", "json", "script"),
            #: The code editor's controls reference as well as its description
            #: (INBOX 410): one entry, not two, because a question about a code
            #: document is nearly always about what it can do. Written from
            #: `DOC_COMMANDS` (documents.js) and `docCodeEditing`'s keymap
            #: (documents-code.js); the chords are checked against the first.
            "body": (
                "A document can be code: give it the extension (fix.py, index.html). "
                "You get syntax colours, error underlines listed in the Problems "
                "panel, hover notes, colour swatches, indent guides and brackets "
                "that close themselves. Completions open as you type (Enter or Tab "
                "takes one, and the grey ghost text is taken with Tab); snippets "
                "expand short words such as for, if, try, class, main or sout, and "
                "Tab walks their stops. HTML and CSS have Emmet: type ! or ul>li*3 "
                "and press Enter or Tab; the command palette (Ctrl+K) has Emmet "
                "wrap and balance inward or outward. Keys: Shift+Alt+F formats, "
                "Ctrl+/ toggles a line comment, Shift+Alt+A a block comment, Alt+Z "
                "wraps long lines, F8 and Shift+F8 step through problems, "
                "Alt+Enter offers quick fixes, F12 goes to a definition, Shift+F12 "
                "lists every use, Ctrl+Shift+F finds in every document, and Go to "
                "a symbol is in the palette. Ctrl+Shift+Enter runs a .js file (in "
                "a sandbox, console output and errors in a panel under the editor) "
                "or renders an .html file; Stop ends it. Blocks fold from the "
                "gutter (Ctrl+Shift+[ and Ctrl+Shift+] fold and unfold, Ctrl+Alt+[ "
                "and Ctrl+Alt+] all of them), sticky scroll pins the enclosing "
                "function at the top, and Show whitespace draws spaces and tabs."
            ),
            "badge": {"label": "Library", "tab": "library"},
        },
        {
            "id": "mind-maps",
            "keywords": ("mind map", "mindmap", "mind-map", "branch", "child topic", "brainstorm"),
            "body": (
                "Mind maps live in the Library, under Boards and maps; New mind map "
                "starts one. Tab adds a child, Enter a sibling, and dragging a topic "
                "onto another moves its whole branch. Right-click a topic for the "
                "ring of actions, where Cross-link joins any two topics."
            ),
            "badge": {"label": "Library", "tab": "library"},
        },
    ]
)

#: **A controls reference per surface** (INBOX 410, the owner: "what if the
#: user asks the guide for all the hidden features, keybinds, controls,
#: utility and more for features like the whiteboard, mindmap and documents
#: editor etc. can it answer those??"). It could not: the entries above say
#: what each surface is, in a paragraph, and a question about its keys found
#: that paragraph or the generic shortcuts entry. Each entry below is written
#: from the surface's own code, not from memory of it: its keydown handlers
#: and shortcut tables (`WB_TOOL_KEYS` and the board's keydown handler in
#: whiteboard.js, `DOC_COMMANDS` in documents.js, the graph box's keydown in
#: graph.js), the menus' own labels in index.html, and the help panels the
#: surfaces already show. Dense on purpose: offline, the entry *is* the
#: answer, and a list of keys cut short is a list that is wrong.
#:
#: Their keywords are the words only a controls question uses ("lasso",
#: "emmet", "cross-link", the chords themselves). The surface's own name is
#: deliberately not among them, so "what is the whiteboard" still reaches the
#: one-paragraph entry; `_CONTROLS_FOR` and `_CONTROL_INTENT` below are what
#: send "what are the whiteboard shortcuts" here instead.
HELP_TOPICS.extend(
    [
        {
            "id": "whiteboard-controls",
            "keywords": (
                "lasso", "highlighter", "eraser", "connector", "nudge", "snap to grid",
                "align", "distribute", "snap", "grid", "bring forward", "send backward", "group",
                "ungroup", "copy style", "paste style", "pan", "zoom", "zoom to fit",
                "board overview", "find a card", "tool",
            ),
            "body": (
                "Whiteboard keys (Library, Boards and maps; Ctrl+Shift+B opens it). "
                "Tools: V or S select, H hand, K lasso, P pen, M highlighter, E "
                "eraser, B fill, L line, A arrow, R rectangle, O circle, G "
                "triangle, D diamond, T text, N sticky note, C connector (Shift+C "
                "curved), I image, X delete. Moving around: the wheel or two "
                "fingers pan, Shift+wheel pans sideways, Ctrl+wheel or a pinch "
                "zooms, Space and drag pans with any tool, Ctrl+= and Ctrl+- zoom, "
                "Ctrl+0 is 100%, Shift+1 fits everything, Shift+N shows the "
                "overview, / or Ctrl+F finds a card. Selection: Shift+click adds, "
                "Ctrl+A selects all, Ctrl+D duplicates, Alt and drag copies as you "
                "drag, Ctrl+C, Ctrl+X and Ctrl+V paste at the pointer, the arrows "
                "nudge (Shift for further), Shift and drag keeps to one axis, "
                "Shift and a corner keeps proportions, [ and ] send back and bring "
                "forward, Ctrl+G groups, Ctrl+Shift+G ungroups, Ctrl+Alt+C and "
                "Ctrl+Alt+V copy and paste a style, Delete removes, Esc cancels a "
                "drag or goes back to Select. Ctrl+Z undoes and Ctrl+Shift+Z "
                "redoes. Double-click empty board for a text box, right-click (or "
                "press and hold on touch) for the menu, double-click a line to bend "
                "it. The top bar's menus: Insert, Edit, Arrange (align, distribute "
                "evenly, order), View (background colour or image, grid of lines, "
                "dots or isometric, snap to grid, fit, 100%, full screen) and "
                "Board (rename, new, export as PNG, SVG, PDF, the image library or "
                "Markdown, switch to a mind map, clear, delete)."
            ),
            "badge": {"label": "Library", "tab": "library"},
        },
        {
            "id": "mind-map-controls",
            "keywords": (
                "cross-link", "cross link", "outdent", "fold", "unfold", "radial",
                "ring", "opml", "freemind", "colour by", "color by", "focus on a branch",
                "tidy", "layout of the map",
            ),
            "body": (
                "Mind map keys (a map lives in the Library under Boards and maps). "
                "With a topic selected: Tab adds a child, Enter a sibling, "
                "Shift+Tab outdents it, the arrow keys walk the tree, F2 or "
                "double-click renames, Delete removes the topic and everything "
                "under it, C folds or unfolds its branch (or click the chevron), "
                "Shift+C draws a cross-link to another topic, F shows only this "
                "branch and its neighbours (F again shows all), and Shift+F10 or "
                "the context menu key opens every action. Right-click a topic for "
                "the ring: Add child, Add beside, Fold, Delete, Cross-link and "
                "More; hold Alt on the ring to remove instead of add. Dragging a "
                "topic onto another moves its whole branch; double-click a line to "
                "label it. The layout picker lays the map out as a tree (right, "
                "left, both sides or downward), radial or free, and Tidy lays "
                "every unpinned topic out again. The View menu sets Colour by "
                "(branch, category, age, or whether a note is behind it) and opens "
                "every folded branch. Start from a template (brainstorm, decision, "
                "project, cause and effect), import an OPML, FreeMind or Markdown "
                "outline, let the local AI propose a map from notes you pick, and "
                "export it as OPML or Markdown as well as a picture."
            ),
            "badge": {"label": "Library", "tab": "library"},
        },
        {
            "id": "documents-controls",
            "keywords": (
                "outline", "split view", "live view", "source view", "read view",
                "suggest changes", "suggestion mode", "track changes", "tracked changes",
                "read aloud", "accessibility check", "grammar", "word goal",
                "typewriter", "focus mode", "find and replace", "replace all",
                "docx", "word document", "microsoft word", "find in every document",
            ),
            "body": (
                "Document editor keys (Library, Documents; Ctrl+Shift+D starts "
                "one). While a document is open, Ctrl+K lists every document "
                "command and ? shows the ones with keys. Ctrl+S saves, Ctrl+B bold, "
                "Ctrl+I italic, Ctrl+E inline code, Ctrl+Shift+S strike through, "
                "Ctrl+1, Ctrl+2 and Ctrl+3 headings, Tab and Shift+Tab indent and "
                "outdent, Ctrl+/ comments the selection, Alt+Up / Alt+Down moves a "
                "section from the outline, and typing / opens the blocks menu. "
                "Ctrl+F finds and replaces (Enter next, Shift+Enter previous, Esc "
                "closes), Ctrl+Shift+F finds in every document. Views: Edit, where "
                "Live renders as you write, Source is the markdown and Split puts a "
                "preview beside it, or Read. The sidebar's Outline lists the "
                "headings (with a filter when there are many), and headings fold. "
                "The document's menus hold History (every version, and a way back "
                "to any), Connections, Extract notes, AI edit, a word goal, focus "
                "mode, typewriter scrolling, dim all but this paragraph, serif for "
                "reading and full width. Writing checks: spelling against your own "
                "dictionary (Add a word), grammar checked on this machine, an "
                "accessibility check (a skipped heading level, an image with no "
                "description, link text like \"click here\"), Suggest changes "
                "(tracked changes to accept or reject one at a time or all at "
                "once), Read aloud (Esc stops), autocorrect, and word suggestions "
                "(Tab accepts). Word: an imported .docx becomes a markdown "
                "document, and Download as .docx writes one back when the optional "
                "Word exporter is installed, beside .md, .html, a .zip with images, "
                "and print or save as PDF."
            ),
            "badge": {"label": "Library", "tab": "library"},
        },
        {
            "id": "graph-controls",
            "keywords": (
                "similarity", "strength slider", "gravity", "spread", "saved view",
                "save a view", "graph view", "graph options",
                "display options", "trace", "unpin", "pin a note", "cluster glow",
                "entities", "hide unlinked", "minimap", "export as png", "lasso",
                "zoom", "pan",
            ),
            "body": (
                "Graph keys and controls. Click the map, then the arrow keys move "
                "between notes, N steps to the next connected note, Enter or Space "
                "opens one, + and - zoom, 0 fits the whole map, Shift and the "
                "arrows pan, Esc leaves. Drag a note to pin it where you put it "
                "(double-click it to hand it back to the layout), drop one note "
                "onto another to link them, double-click empty space to add a note "
                "there, hover to spotlight a note's connections, and click a legend "
                "colour to hide that category. Shift and drag on empty map lassos "
                "notes, and the selection bar can Tag, Link together or make a Mind "
                "map of them. Trace finds how two notes connect. Display options: "
                "Unpin all, Gravity and Spread, the Show switches (Similarity, "
                "Entities, Documents, Boards, Hide unlinked, Labels, Curved links, "
                "Cluster glow, Length by similarity), the similarity Strength "
                "slider (raise it to keep only the closest matches), a Time filter "
                "you can play, Groups that paint notes matching some words one "
                "colour, the minimap's position and size, and Reset, which puts the "
                "layout, colours, physics, switches, time filter and minimap back "
                "and keeps groups and saved views. Saved views keep the layout, "
                "filters and position under a name; Export as PNG saves what is on "
                "screen."
            ),
            "badge": {"label": "Graph", "tab": "graph"},
        },
        {
            "id": "chat-controls",
            "keywords": (
                "fork", "compress", "regenerate", "plan first", "attach a note",
                "context window", "export the chat", "stop the answer",
            ),
            "body": (
                "Chat keys and controls. Enter sends and Shift+Enter starts a new "
                "line; Ctrl+. stops the answer, Ctrl+Shift+O starts a new chat, "
                "Ctrl+Shift+G turns agent mode on or off, Ctrl+Shift+P clips a note "
                "to your next question, and Ctrl+Shift+A opens the same agent over "
                "any tab. Typing / in the box opens the chat menu: attach a note, a "
                "document, a file or an image, upload something new, Web search, "
                "Plan first (the agent shows its steps before it starts), Skills, "
                "and Agent or Ask mode. Each message's menu can copy it, edit your "
                "question, regenerate from here, save it as a note or read it "
                "aloud. The header can fork the conversation, compress the earlier "
                "messages (Undo goes back), show how full the model's context is, "
                "switch the model, and export the chat as Markdown."
            ),
            "badge": {"label": "Chat", "tab": "chat"},
        },
        {
            "id": "notes-controls",
            "keywords": (
                "search syntax", "search operator", "filter syntax", "is:favourite",
                "tag:", "cat:", "exact phrase", "select several", "batch",
                "move several", "several notes", "multiple notes", "bulk", "notes filter",
                "filter notes", "blocks menu", "slash menu",
            ),
            "body": (
                "Notes keys and controls. In Capture a thought, Ctrl+Enter saves, "
                "/ (or Ctrl+/) opens the blocks and commands menu, Ctrl+J asks "
                "Atlas to write at the cursor, and selecting text shows an actions "
                "menu (Ctrl+Shift+E from the keyboard). From anywhere, Ctrl+Shift+N "
                "starts a note, Ctrl+D opens today's note and Ctrl+Shift+R records a "
                "meeting. The filter box understands, with no AI: two words (both, "
                "in any order), \"a quoted phrase\", tag:work, cat:recipes, "
                "is:favourite, is:pinned, is:private, is:linked, is:untagged, "
                "tags:<2 (also <=, > and >=), and -word to leave a word out. Select "
                "ticks several notes to move to a category, tag or delete together, "
                "and Select all ticks the whole page."
            ),
            "badge": {"label": "Notes", "tab": "notes"},
        },
        {
            "id": "library-controls",
            "keywords": ("sub-tab", "subtab", "sort the library", "select all", "boards and maps"),
            "body": (
                "Library controls. The sub-tabs are All (everything you have made), "
                "Documents, Boards and maps, Images, Files, AI skills, Links and "
                "Contents. Search, then sort newest first, oldest first, A to Z or "
                "biggest first, and set how many show per page. Tick a card's box "
                "to select it: the bar that appears has Select all, Open, Restore "
                "(for binned items), Delete and Done, and Documents and the gallery "
                "have bars of their own. New mind map, Generate a map from notes "
                "and Import an outline sit on Boards and maps; Images takes "
                "uploads of pictures and PDFs."
            ),
            "badge": {"label": "Library", "tab": "library"},
        },
        {
            "id": "timeline-controls",
            "keywords": ("time bucket", "feed view", "table view", "jump to today", "density strip", "group by"),
            "body": (
                "Timeline controls. Feed shows the newest first, grouped by date; "
                "Table shows every column, sortable. Pick the time bucket (Auto, "
                "Day, Week, Month or Year), what rows are grouped by (Category, "
                "Tag, Thread, None or Everything) and show only one group, how far "
                "back (the last 3 months, the last year, everything or a custom "
                "range), and which kinds of thing it shows; Jump to today returns. "
                "A note that names a date (\"the deadline is next Friday\") sits on "
                "that day, marked with a clock. The arrow keys walk the rows, Home "
                "and End jump to the ends, Enter opens a row where it sits and Esc "
                "closes it; in Select mode Space ticks a row, and the bar moves, "
                "tags or deletes them. The density strip beside the feed shows how "
                "much was written when: click or drag it to go there."
            ),
            "badge": {"label": "Timeline", "tab": "timeline"},
        },
        {
            "id": "reminders-controls",
            "keywords": ("magic add", "quick set", "priority", "tonight", "this weekend"),
            "body": (
                "Reminders controls. Magic add takes a sentence (\"Call mum "
                "tomorrow evening, high priority\") and works out the time and the "
                "priority. Or type the reminder, pick a priority (normal, low or "
                "high) and a repeat (once, daily, weekly or monthly), and use Quick "
                "set: in 30 min, in 1 hour, in 3 hours, tonight 7pm, tomorrow 9am, "
                "tomorrow 2pm, this weekend or next week. A due reminder can be "
                "snoozed one hour or to tomorrow 9am, edited in place, or ticked "
                "done; completed ones page at the foot. Press m then r to jump here "
                "from anywhere."
            ),
            "badge": {"label": "Reminders", "tab": "reminders"},
        },
        {
            "id": "dashboard-controls",
            "keywords": ("quick start", "focused view", "full view", "tools & features", "tools and features"),
            "body": (
                "Dashboard controls. View switches between Full, Compact and "
                "Focused. Widgets and Edit layout show, hide and rearrange widgets, "
                "remembered per user. The quick start row has New note, Ask AI, "
                "Sketch, Remind me, Meeting notes, Search notes, Tools & features "
                "(a searchable list of everything the app can do) and Commands "
                "(the command palette). Press m then d to come back here from "
                "anywhere."
            ),
            "badge": {"label": "Dashboard", "tab": "dashboard"},
        },
        {
            "id": "hidden-features",
            "keywords": (
                "hidden feature", "hidden", "secret", "tips", "tricks", "tips and tricks",
                "power user", "easter egg", "things i might not know", "didn't know",
                "chord", "m then", "m chord", "every feature", "all the features",
            ),
            #: The "m" chord's two tables (`TAB_JUMP_KEYS` and `CHORD_ACTIONS`,
            #: app.js) are written out letter by label, and checked against the
            #: tables, so a letter added there has to be added here.
            "body": (
                "Hidden features and power keys. Ctrl+K is the command palette "
                "(jump anywhere, run an action), Ctrl+P is Find anything (notes, "
                "files and actions), and ? lists every shortcut, which Settings -> "
                "Shortcuts rebinds. Press m then a letter to jump: d (Dashboard), n "
                "(Notes), c (Chat), g (Graph), l (Library), t (Timeline), r "
                "(Reminders); or to act: s (Settings), q (Quick sketch), v (Meeting "
                "notes), a (Guide), p (Popup agent). A second m closes the hint. "
                "Ctrl+Shift+A opens the agent over any tab, Ctrl+Shift+H asks Atlas "
                "about the app, Ctrl+J writes at the cursor, Ctrl+Shift+E acts on "
                "selected text, Ctrl+Shift+K opens the quick sketch pad, and "
                "Ctrl+Alt+R reloads the app clearing cached files. Every menu works "
                "from the keyboard: the arrows move, Home and End jump, Enter picks "
                "and Esc closes. Select in Notes, the Timeline and the Library acts "
                "on many items at once, the notes filter takes tag:, cat: and is: "
                "operators, the dashboard's Tools & features lists everything the "
                "app can do, and each section's ? explains itself."
            ),
            "badge": {"label": "Shortcuts", "section": "shortcuts"},
        },
    ]
)

#: **Which entry answers "the keys of" a surface.** A question that names a
#: surface and asks about its keys, controls or hidden corners is about that
#: surface's controls entry, and the ranking below cannot see that on words
#: alone: "whiteboard" belongs to the description and "shortcut" to the global
#: shortcuts entry, so without this the question landed on one of those two.
_CONTROLS_FOR: dict[str, str] = {
    "whiteboard": "whiteboard-controls",
    "mind-maps": "mind-map-controls",
    "documents": "documents-controls",
    "graph": "graph-controls",
    "ask-chat": "chat-controls",
    "capture": "notes-controls",
    "library": "library-controls",
    "timeline": "timeline-controls",
    "reminders": "reminders-controls",
    "dashboard": "dashboard-controls",
    #: The code editor's entry is its own controls reference (see its body).
    "code-files": "code-files",
}

#: The words that make a question about a surface a question about its
#: controls. Deliberately narrow: "how do I make a mind map" is not one, and
#: that is the question most people ask.
_CONTROL_INTENT = re.compile(
    r"\b(?:shortcuts?|keybinds?|keybindings?|key ?binds?|hotkeys?|keys|keyboard|"
    r"controls?|gestures?|chords?|hidden|secret|tips|tricks|power user|"
    r"everything (?:i|you) can do|what can i do|all the (?:features|tools|things))\b"
)

#: **The chords themselves are keywords.** "What does F12 do" names nothing
#: but a key, and the entry that documents F12 is the right answer; every
#: chord a controls entry's body names is added to its keywords, lowercased,
#: so the table and the prose cannot disagree about which keys an entry
#: covers. `_normalise_keys` below spells a question's chords the same way.
_CHORD = re.compile(
    r"(?<![\w+])(?:(?:Ctrl|Shift|Alt)\+)+(?:F\d{1,2}|Enter|Tab|Up|Down|Left|Right|"
    r"[A-Za-z0-9]\b|[/.,=\-\[\]])|(?<![\w+])Shift\+F\d{1,2}\b|(?<![\w+])F\d{1,2}\b"
)

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


#
# **Lookarounds rather than `\b`** (INBOX 410): a keyword can be a chord now
# ("ctrl+/", "tag:"), and `\b` after a "/" or a ":" asks for a word character
# to follow it, which "what does ctrl+/ do" does not have. The guards below are
# `\b` exactly where a keyword starts or ends with a word character, and no
# guard where it does not; a chord is also refused when it is only the tail
# of a longer one ("shift+k" inside "ctrl+shift+k").
def _keyword_pattern(keyword: str) -> re.Pattern[str]:
    if len(keyword) > 3 and keyword.endswith("y") and keyword[-2] not in "aeiou":
        stem = re.escape(keyword[:-1]) + "(?:y|ies)"
    else:
        stem = re.escape(keyword) + "(?:es|'s|s)?"
    start = r"(?<![\w+])" if "+" in keyword else (r"(?<!\w)" if keyword[0].isalnum() else "")
    end = r"(?!\w)" if keyword[-1].isalnum() else ""
    return re.compile(rf"{start}{stem}{end}")


#: A chord as people type it ("ctrl shift f", "Cmd-K", "control k") spelt the
#: way the entries spell it ("ctrl+shift+f"), so a chord keyword can match.
#: The lookahead insists on a key after the modifier, so "shift and drag" and
#: "the control panel" are left alone.
_MODIFIER = re.compile(
    r"\b(ctrl|control|cmd|shift|alt|option)\s*(?:\+|-|\s)\s*"
    r"(?=(?:ctrl|control|cmd|shift|alt|option)\b|f\d{1,2}\b|enter\b|tab\b|up\b|down\b|"
    r"left\b|right\b|[a-z0-9](?![a-z0-9])|[/.,=\-\[\]])"
)
_MODIFIER_NAMES = {"control": "ctrl", "cmd": "ctrl", "option": "alt"}


def _normalise_keys(lowered: str) -> str:
    return _MODIFIER.sub(lambda m: _MODIFIER_NAMES.get(m.group(1), m.group(1)) + "+", lowered)


#: The chord keywords, added here rather than beside `_CHORD` because they are
#: compared in `_normalise_keys`'s spelling. **A chord an entry already names
#: in its own keywords is that entry's**: "ctrl k" is the command palette's,
#: and the five controls entries that mention Ctrl+K in passing must not
#: outvote the entry about it.
_CLAIMED_KEYS = {_normalise_keys(k) for _topic in HELP_TOPICS for k in _topic["keywords"]}
for _topic in HELP_TOPICS:
    if _topic["id"] in set(_CONTROLS_FOR.values()) | {"shortcuts", "hidden-features"}:
        _chords = dict.fromkeys(c.lower() for c in _CHORD.findall(_topic["body"]))
        _topic["keywords"] = _topic["keywords"] + tuple(c for c in _chords if c not in _CLAIMED_KEYS)


_KEYWORD_PATTERNS: dict[str, re.Pattern[str]] = {
    keyword: _keyword_pattern(_normalise_keys(keyword))
    for topic in HELP_TOPICS
    for keyword in topic["keywords"]
}


def _edit_distance_at_most_one(a: str, b: str) -> bool:
    """True when `a` becomes `b` by one insertion, deletion, substitution or
    swap of two neighbours: the typos a person makes in a help box ("remnder",
    "serach", "chnage")."""
    if a == b:
        return True
    la, lb = len(a), len(b)
    if abs(la - lb) > 1:
        return False
    if la == lb:
        diff = [k for k in range(la) if a[k] != b[k]]
        if len(diff) == 1:
            return True
        return (
            len(diff) == 2
            and diff[1] == diff[0] + 1
            and a[diff[0]] == b[diff[1]]
            and a[diff[1]] == b[diff[0]]
        )
    if la > lb:
        a, b = b, a
    k = 0
    while k < len(a) and a[k] == b[k]:
        k += 1
    return a[k:] == b[k + 1 :]


_WORD = re.compile(r"[a-z0-9]+")

#: Single-word keywords long enough to forgive a typo in (a four-letter word
#: one letter off is usually a different word).
_TYPO_MIN = 5

#: How many topics each keyword belongs to, for the rarity weight below.
_KEYWORD_TOPICS: dict[str, int] = {}
for _topic in HELP_TOPICS:
    for _keyword in set(_topic["keywords"]):
        _KEYWORD_TOPICS[_keyword] = _KEYWORD_TOPICS.get(_keyword, 0) + 1

#: Body vocabulary per topic, for tie-breaking only (see `_matching_topics`).
_BODY_WORDS: dict[str, set[str]] = {
    topic["id"]: set(_WORD.findall(topic["body"].lower())) for topic in HELP_TOPICS
}

#: Words that say nothing about which feature is meant.
_STOP = frozenset(
    "a an the i me my you your it its is are am be to of in on at for and or "
    "how do does did can could would should what whats where which who why "
    "when this that there here with from into about any all some so if not "
    "no yes get got make use using used want need way".split()
)

#: A runner-up worth showing scores at least this share of the best: below
#: it, the second topic is noise the answer would be padded with.
_RUNNER_UP_SHARE = 0.4


def _matching_topics(question: str) -> list[dict]:
    """Which `HELP_TOPICS` entries this question is about, best first.

    **Rebuilt 2026-09-24 against a question bank** (INBOX 406,
    `tests/fixtures/help_questions.json`, 100 questions phrased the way people
    type them): the old rule, one point per matching keyword weighted by its
    word count, answered 49 of them first-time right and matched nothing for
    20 (a typo, "pictures" for image, "talk to the ai" for chat). Four rules
    now, each measured against the bank:

    * **A topic qualifies on its keywords, never on its body**, so a question
      about the weather still matches nothing: a keyword is matched as a whole
      phrase with its plural (`_keyword_pattern`), or, for a single keyword of
      five letters or more, as a word one typo away.
    * **A keyword is worth its word count times its rarity**: "web search"
      still outweighs "search", and a word three topics share ("restore")
      says less than one only this topic has.
    * **Body words break ties**: among qualifying topics, one whose own text
      uses more of the question's words ranks higher.
    * **A runner-up must earn its place**: under 40% of the best score it is
      dropped, so the answer is not padded with a topic that matched one
      incidental word.
    """
    lowered = _normalise_keys(question.lower())
    words = [w for w in _WORD.findall(lowered) if w not in _STOP]
    total = len(HELP_TOPICS)
    scores: dict[str, float] = {}
    for topic in HELP_TOPICS:
        score = 0.0
        for keyword in topic["keywords"]:
            rarity = 1.0 + math.log(total / _KEYWORD_TOPICS.get(keyword, 1))
            if _KEYWORD_PATTERNS[keyword].search(lowered):
                score += len(keyword.split()) * rarity
            elif (
                " " not in keyword
                and len(keyword) >= _TYPO_MIN
                and any(len(w) >= _TYPO_MIN - 1 and _edit_distance_at_most_one(w, keyword) for w in words)
            ):
                score += 0.8 * rarity
        if score > 0:
            scores[topic["id"]] = score
    if not scores:
        return []
    #: **A surface's controls entry** (INBOX 410, see `_CONTROLS_FOR`). With
    #: a word asking for keys or controls, the named surface's controls entry
    #: goes above everything the words alone reached, the surface's own score
    #: ordering two named surfaces; without one, a controls entry that already
    #: qualified on its own keywords ("zoom", "lasso") takes the surface's
    #: score as well, which is what tells the graph's zoom from the board's.
    intent = bool(_CONTROL_INTENT.search(lowered))
    top = max(scores.values())
    for surface, controls in _CONTROLS_FOR.items():
        named = scores.get(surface)
        if not named:
            continue
        if intent:
            scores[controls] = max(scores.get(controls, 0.0), top) + named
        elif controls in scores and controls != surface:
            scores[controls] += named
        #: The description stays in the answer as a related entry, so the
        #: offline reply still names "graph" under the graph's controls.
        if controls != surface and controls in scores:
            scores[surface] = max(named, scores[controls] * _RUNNER_UP_SHARE)
    scored: list[tuple[float, int, dict]] = []
    for order, topic in enumerate(HELP_TOPICS):
        score = scores.get(topic["id"])
        if score is None:
            continue
        body = _BODY_WORDS[topic["id"]]
        score += 0.15 * sum(1 for w in words if w in body)
        scored.append((score, order, topic))
    scored.sort(key=lambda row: (-row[0], row[1]))
    best = scored[0][0]
    return [topic for score, _, topic in scored[:MAX_TOPICS] if score >= best * _RUNNER_UP_SHARE]


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
    #: **One answer, then where else to look** (INBOX 406). Three topics'
    #: bodies pasted end to end read as a wall where the question's answer
    #: was one paragraph of three; the best match is the answer, and the
    #: runners-up (already cut to those worth showing, `_RUNNER_UP_SHARE`)
    #: are named as related, with their chips below as before.
    body = topics[0]["body"]
    related = [name.lower() for name in source_names(topics[1:])]
    if related:
        body += "\n\nRelated: " + ", ".join(related) + "."
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
