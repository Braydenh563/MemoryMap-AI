# meetings-644: the meeting notes redesign (INBOX 644, the meeting parts of 643)

Worktree `agent-af7318c2071284d02`, merged from `claude/mini-release-0.4.1`
68de7ac. The owner: "Can you also redesign and expand and improve the meeting
notes feature?? I feel like it is neglected and a bit left behind and tucked
away." and, 2026-10-06, "and do the meeting notes redesign and expansion as
well".

## Audit: what exists (measured 2026-10-06, 1440x900, light, server :8815)

Four meeting shapes, none of which knows about the others:

| Shape | Where | What it makes |
| --- | --- | --- |
| The recorder (`#meeting-overlay`, media.js `openMeetingRecorder`) | Dashboard quick access "Meeting notes: Record and transcribe" (1 click), chord `m` `v`, Ctrl+Shift+R, palette "Record a meeting or lecture", Library Meetings chip's create button "Transcribe audio" | A plain note: optional title line, an uncited AI "Decisions / Action items" block (`/voice/summarize`) when a model runs, the transcript, tag `meeting`. No date, no attendees, no type, no checkboxes. Or a document of the raw transcript. |
| The Capture template "Meeting" (app.js `BUILTIN_TEMPLATES`) | Notes, Capture, Template, Meeting, Use this template: 4 clicks from Notes, 5 from the home screen | Four plain lines: "Meeting about / Who: / Decisions: / To do:". No date, no type, no tag, no checkboxes, so it is not in the Meetings chip. |
| The document template "Meeting notes" (documents.js) | Documents, New from a template | A document with Date, Attendees, Agenda, Notes, Decisions, Actions (`- [ ] Who, what, by when`). Not a note: not in the Meetings chip, not on the timeline at its date. |
| The note type "Meeting" (entry/properties.py `BUILTIN_TYPES`: date, attendees, project) | Palette "Note types", a type's kebab, "New note of this type" | A note `# New meeting` with an empty property block. Not tagged `meeting`, so not in the Meetings chip. |

What disappoints, measured:

1. **Tucked away.** The one-click home entry ("Meeting notes") opens a
   recorder (880x286 dialog whose only control is Record), not a meeting
   note. Writing a meeting note by hand, the common case, is five clicks
   through a template the dialog does not call a meeting. Palette for
   "meeting": "Note types", "Record a meeting or lecture", search. No "New
   meeting" anywhere. Notes sidebar: All, Drafts, Favourites, Tags; no
   Meetings row. Library's Meetings chip appears only once a note is
   tagged `meeting` and counts only the tag.
2. **No shape.** No agenda, attendees, decisions or action items unless the
   person types them; the recorder's save has none of them.
3. **Action items go nowhere.** `- [ ]` renders as a checkbox (the
   dashboard's Outstanding widget lists them), but there is no owner, no
   due date and no path to the Reminders tab.
4. **Timeline.** A meeting note sits at the moment it was typed, not at the
   meeting's `date:`; `timewords.find` reads relative phrases only, and
   `date: 2026-10-07 14:00` resolves to nothing. Measured: the row for a
   meeting dated tomorrow sat under "Today" at 9:07 AM.
5. **Bug: a note with a property block shows "---" as its timeline title**
   and the raw `type: Meeting date: ... attendees: [...] ---` as its
   preview (`_place_notes` clips `readable_content`, which keeps the block).
6. **Bug: the note edit form's Title is empty for a typed note.**
   `renderEditForm` looks for `# ` at offset 0, which is the `---` fence for
   any note of a type (`New note of this type` writes the block first), so
   the heading stays in the body; a title typed there is written above the
   fence by `withTitle`, which turns the property block into body text.
7. **The AI summary is uncited** and prepended without review or Undo.

Compared with (from knowledge, no fetches): OneNote's Meeting Details
(Outlook meeting: date, location, attendees, agenda inserted into the page;
tags "To Do" that can become Outlook tasks; audio recording in the page with
the notes time-linked), Notion (meeting database with date and attendees,
template with agenda, notes, action items as to-dos with assignee and due),
Granola (your typed notes enhanced by the transcript, each AI line traceable,
local templates per meeting type), Otter (live transcript, summary, action
items assigned to speakers). Taken: a dated, attended page with agenda,
notes, decisions and to-dos; to-dos with an owner and a due that become real
reminders; the meeting on the calendar (timeline) at its time; recording into
the same page; an AI pass whose every line points at the words it came from.
Not taken: calendar sync (offline app), speaker diarisation (no local model
for it), per-line audio time links (the recorder keeps no audio).

## Build (decisions 1 to 5 of the brief)

Built, measured by `scratchpad/ui-sweeps/meetings644.js` (light and dark at
1440; light and dark at 390 under touch; all checks pass in all four):

1. **Findable.** New meeting is the Dashboard's fifth Quick access tile
   (one click from home; the tile id `meeting-notes` is kept so saved
   layouts keep it), a palette command (`reveal: "meeting-new"`), Library's
   Create row, and a Tools and features row. Notes has a Meetings row
   (`tag:meeting`, heading "Meetings"). Library's Meetings chip counts
   every meeting, since every meeting carries the tag.
2. **One shape.** `entry/meetings.py` writes it (`POST /meetings`):
   `type: Meeting`, `date`, `attendees`, then Agenda, Notes, Decisions,
   Action items, in the normal editor. Any note typed Meeting gets the
   `meeting` tag on create (template, type, import). The Capture template
   is the same shape (no date: it is placed where it was written, which is
   when the meeting was). No migration: nothing a note does not hold.
3. **No model needed**, except Summarise: `/meeting/summarise` keeps only
   lines whose quoted source is in the note (dropped lines counted and
   said), shows them with their words, adds them after the person's own
   lines on Add, with Undo (toast and the app's undo stack). The recorder
   is reused (local Whisper, its consent text unchanged); a saved recording
   is a meeting, or goes under the Notes of the meeting it was opened from
   (Record into it). The uncited summary the old save prepended is gone.
4. **Timeline and reminders.** A Meeting with a `date:` sits at it
   (`placed_by: "meeting"`, the users-three mark, "A meeting on ..." title).
   An action item becomes a reminder linked to the meeting
   (`/meeting/remind`): its due read by Magic Add's no-model rules from the
   line ("by Friday", "tomorrow at 3pm"), or asked for ("When?").
5. **Recipes.** `openSheet`, `.prop-row`, the tag-field chips, `chip()` for
   the meeting chip on the details line, the list-row recipe for action
   items (`.meeting-action` added to `LIST_ROWS` in test_ui_recipes.py), the
   dialog buttons. Help: `meetings` Guide topic, the voice topic, the chord
   label (m then v is "Record a meeting"), the recorder's '?' text.

Fixed on the way: the timeline row of a typed note showed "---" and the raw
block (audit item 5); the edit form holds a typed note's block out of the text
box and finds its title under it (item 6, `noteFormParts`, node-tested in
`tests/test_note_form_property_block.py`); a double click on a Create row
stacked two New meeting sheets.

For the orchestrator: INBOX 644 (ROADMAP "Next PR, first", item 1) is built
to its five decisions; 643's meeting parts are in the comparison above, its
other parts (pages, sections, ink, tags) are not this agent's.

## Remaining

- Meeting cards show their section headings as raw `## Agenda` text, as
  every note card does (`renderNoteText` keeps headings as text by design).
  A meeting-aware card preview (when, who, open action items) would read
  better; it is a note-card change, so it needs its own pass.
- The Timeline's table view (a phone's default) has no mark column, so a
  meeting reads as a Note there; the feed view shows the meeting mark.
- Summarise is verified only against the fake model (`tests/test_meetings_644.py`):
  how a real small model keeps to the pipe format and quotes is not known.
- Transcription is not verifiable here (no faster-whisper in the sandbox);
  the recorder's save is driven with a typed transcript in the sweep.
- The documents' "Meeting notes" template is still a document (not a typed
  note): left, since documents are their own surface.
- Not taken from OneNote/Granola/Otter: calendar sync (offline), speaker
  labels, audio time links per line.
- `tests/test_properties_never_in_previews.py::test_the_frontends_raw_content_clips_read_past_the_block`
  fails on the base branch already (app-palette.js no longer clips note text
  after INBOX 666); not this work's file.
