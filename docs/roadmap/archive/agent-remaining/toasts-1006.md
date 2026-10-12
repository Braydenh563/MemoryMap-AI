# toasts-1006: which error toasts are faults, which are expected situations

Done in worktree `agent-a3fc0f99358b8857f` from `claude/notes-flow-rebuild` 22c3169.
The owner's end-to-end pass found that normal situations showed the red error
toast with "Report this" (Dictate without the voice add-on, Compress on an empty
chat, Add on an empty reminder), so a person thought the app was broken. The
three named cases were already plain toasts (`tests/test_no_report_on_expected.py`);
this pass found the other hundred.

## Result

Every `toast(...)` call in `frontend/js/*.js` that passes `true` was classified
(469 calls, found by a balanced-paren scan, not grep: four span several lines).
The brief said about 105; that was the expected-situation count, the total was 469.

| Class | Calls | What happens now |
| --- | --- | --- |
| b expected situation | 108 | `toast(text, "info")`: plain, no "Report this", ignores "mute notifications" |
| a fault, literal message | 36 | unchanged, red with "Report this"; each is listed with its reason in `FAULTS` in the test |
| a fault, a failed request's own `error.message` | 325 | unchanged call; the helper shows it plain when the server answered 4xx (a refusal by design), red for 5xx, network failure or exception |
| plus one computed flag | 1 | `library.js` 6411 (a describe that wrote nothing) is plain |

## The helper change (gzipped as served: app.js 14,205 to 14,222 of 14,300, total 319,757 to 319,896 of 320,300)

- `toast()` in status.js: `isError === "info"`, or `true` with a message found
  in `toast.refused`, becomes a plain toast with `exempt` (a direct answer to a
  press must not be silenced by "mute notifications"; before, a muted install
  would have lost the plain version of these messages entirely).
- `api()` in app.js: `if (response.status < 500) toast.refused.add(errMsg);`.
  The 325 catch-block calls need no edit; this is the one change that covers them.
- 109 call sites now pass `"info"`: 106 by script, two multi-line ones by hand,
  and `library.js` 6411's computed flag. No wording changed: each message already
  says what to do or what is missing.

## Lint

`tests/test_error_toasts.py`: every expected call is `"info"`; a new `true` call
with a message of its own that is not a failed request's `.message` fails until
it is listed in `FAULTS` with a reason (or made `"info"`); a computed flag must
be in `DYNAMIC`; "Report this" has one home (status.js) and the helper gates it.

## Not verified

- Browser, port 8810 (`/tmp/claude-0/.../scratchpad/verify.js`, Playwright):
  Dictate without the add-on, Compress on an empty chat, Add on an empty
  reminder, a direct `"info"` toast, an `"info"` toast with notifications muted
  (shown), a 404 through `apiJson` then `toast(e.message, true)` (plain, no
  button, blue ink), a 500 (red, with Report this) and the network line (red,
  with Report this). The other 100 call sites were not each triggered; they are
  one string flag each, covered by the lint, and their situations (for example a
  formatter refusing a file, Atlas off in Suggestions) were not driven.
- The 4xx rule trusts the server's status: a 4xx that is really a client bug
  (a 422 from a malformed request) now shows plain, so it would no longer offer
  "Report this"; it is still in Settings > Logs (`recordBrowserLog`).

## Found, not fixed

- `settings-packages.js` 397, 538, 553, 567: `toast(result.message, !result.started)`
  is red when a package action did not start, which is often "busy" or "already
  installed"; the server's reply carries no kind, so it is left red.
- `suggestions-inbox.js` 578 (partial link run) and `whiteboard.js` 8857 (a clear
  that left items) are red by a computed flag; they are partial failures.
- `ai-tools.js` 685 and neighbours say "Open Settings, Models" in words; none is a
  link. A button on the toast would be the next step and is a new control.

## Classification table

Class `a` keeps the error style; `b` is plain. Messages are the first argument's
source text, cut at 90 characters. Line numbers are from the tree before this commit.

| file:line | message | class | why |
| --- | --- | --- | --- |
| ai-tools.js:58 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| ai-tools.js:579 | `error.message \|\| "Couldn't set that model."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| ai-tools.js:685 | `"Models aren't available yet. Open Settings, Models to check."` | b expected (plain) | a feature that needs the AI, a model or a setting that is off; says where to turn it on |
| ai-tools.js:1126 | `"Write something first, then improve it."` | b expected (plain) | a check on what the person entered or picked; says what to fix |
| ai-tools.js:1226 | `"Pick an embedding model first, e.g. nomic-embed-text."` | b expected (plain) | a feature that needs the AI, a model or a setting that is off; says where to turn it on |
| ai-tools.js:1258 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| app.js:855 | `body.warning` | b expected (plain) | the situation is the person's own text or the model's empty answer; retry or edit, not a bug |
| app.js:992 | `"Can't reach the MemoryMap server. Is it running?"` | a fault | network failure: the server cannot be reached |
| app.js:1099 | `'Couldn't ${label}: ${error.message}'` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| app.js:1104 | `'Couldn't ${label}: ${error.message}'` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| ask-chart.js:194 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| ask-history.js:109 | `"That question is no longer in your history."` | b expected (plain) | the target changed or went away since it was offered (a stale offer or a hidden item), not a fault |
| ask-history.js:220 | `error.message \|\| "Couldn't change the pin."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| ask-history.js:231 | `error.message \|\| "Couldn't delete that question."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| ask-history.js:244 | `error.message \|\| "Couldn't clear the history."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| attach-to.js:91 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| attach-to.js:176 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| attachment-actions.js:84 | `error.message \|\| 'Couldn't save “${attachmentLabel(spec)}”.'` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| attachment-actions.js:117 | `error.message \|\| "Couldn't rename that file."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| attachment-actions.js:125 | `'Describing a file needs the local AI. ${AI_OFFLINE_HINT}.'` | b expected (plain) | a feature that needs the AI, a model or a setting that is off; says where to turn it on |
| attachment-actions.js:134 | `"Couldn't find that upload."` | a fault | the upload the menu points at is missing from the list: an unexpected state |
| attachment-actions.js:139 | `error.message \|\| "Couldn't describe that file."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| attachment-actions.js:149 | `"Couldn't find that file."` | a fault | the file the menu points at is missing: an unexpected state |
| attachment-actions.js:158 | `error.message \|\| "Couldn't save that description."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| attachment-actions.js:171 | `error.message \|\| "Couldn't open that picture for drawing."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| attachment-actions.js:198 | `error.message \|\| 'Couldn't delete “${label}”.'` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| avatars.js:3526 | `"Give the companion a name first."` | b expected (plain) | a check on what the person entered or picked; says what to fix |
| avatars.js:3537 | `'You can keep ${NMB_PRESET_MAX} saved companions: delete one first.'` | b expected (plain) | a limit the app sets on purpose; says what to do instead |
| batch-space.js:53 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| capture-ask.js:268 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| capture-ask.js:370 | `"Couldn't read the clipboard, so that part of the template is empty."` | b expected (plain) | the browser or window lacks, or the person blocked, a capability; nothing in MemoryMap failed |
| capture-ask.js:3248 | `error.message \|\| "Couldn't change that question."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| capture-ask.js:3317 | `"Reading is paused in Settings, What it learned."` | b expected (plain) | the situation is the person's own text or the model's empty answer; retry or edit, not a bug |
| categories-panel.js:313 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| categories-panel.js:435 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| categories-panel.js:491 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| categories-panel.js:525 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| categories-panel.js:555 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| categories-panel.js:608 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| categories-panel.js:633 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| categories-panel.js:688 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| categories-panel.js:732 | `"Name the new category first."` | b expected (plain) | a check on what the person entered or picked; says what to fix |
| categories-panel.js:733 | `"Tick the notes to move first."` | b expected (plain) | a check on what the person entered or picked; says what to fix |
| categories-panel.js:749 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| categories-panel.js:807 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| categories-panel.js:838 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| categories-panel.js:916 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| categories-panel.js:1010 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| chat-agent.js:1261 | `error.message \|\| "Couldn't undo that."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| chat-agent.js:1727 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| chat-agent.js:1788 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| chat-attach.js:459 | `error.message \|\| 'Couldn't read "${file.name}".'` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| chat-attach.js:1530 | `error.message \|\| "Couldn't upload the attached image."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| chat-attach.js:2374 | `"The model returned nothing that time. Try again."` | b expected (plain) | an empty state: there is nothing to act on yet |
| chat-attach.js:2533 | `"Couldn't save this chat turn."` | a fault | saving a chat turn failed after the model answered: lost data |
| chat-attach.js:2749 | `"Couldn't delete that message."` | a fault | delete request failed |
| chat-attach.js:2937 | `"Couldn't delete this chat."` | a fault | delete request failed |
| chat-attach.js:2968 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| chat.js:232 | `error.message \|\| "Couldn't save that note."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| chat.js:264 | `error.message \|\| "Couldn't set a reminder."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| chat.js:744 | `'Couldn't edit that: ${error.message}'` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| chat.js:835 | `error.message \|\| "Couldn't fork from here."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| chat.js:1230 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| chat.js:1458 | `error.message \|\| "Couldn't save that bookmark."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| chat.js:1615 | `"Turn on Web search first, reading a page needs it."` | b expected (plain) | a feature that needs the AI, a model or a setting that is off; says where to turn it on |
| chat.js:1718 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| chat.js:1760 | `error.message \|\| "Couldn't read that page."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| chat.js:2241 | `error.message \|\| "Couldn't save that document."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| dashboard.js:3007 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| dashboard.js:3831 | `error.message \|\| "Couldn't link those notes."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| dashboard.js:3857 | `error.message \|\| "Couldn't dismiss that."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| dashboard.js:3900 | `error.message \|\| "Couldn't read that list."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| dashboard.js:3973 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| dashboard.js:4136 | `error.message \|\| "Couldn't read what would be undone."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| dashboard.js:4159 | `error.message \|\| "Couldn't undo that."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| dashboard.js:4545 | `error.message \|\| "Couldn't save that."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| documents-code.js:1499 | `"Emmet could not be loaded, so nothing was wrapped."` | a fault | the Emmet module failed to load: a broken asset |
| documents-code.js:1514 | `'Emmet cannot read "${abbr}" as an abbreviation.'` | b expected (plain) | the situation is the person's own text or the model's empty answer; retry or edit, not a bug |
| documents-code.js:4205 | `"Formatting is for code documents."` | b expected (plain) | the situation is the person's own text or the model's empty answer; retry or edit, not a bug |
| documents-code.js:4209 | `"Formatting needs the code editor, which has not loaded."` | a fault | the code editor failed to load: a broken asset |
| documents-code.js:4217 | `"Select the lines to format first."` | b expected (plain) | a check on what the person entered or picked; says what to fix |
| documents-code.js:4224 | `refusal` | b expected (plain) | the formatter refused the person's own text (a syntax problem in what they wrote) |
| documents-code.js:4230 | `"The text changed while it was being checked. Format again."` | b expected (plain) | the target changed or went away since it was offered (a stale offer or a hidden item), not a fault |
| documents-code.js:4255 | `result.error` | b expected (plain) | the formatter refused the person's own text (a syntax problem in what they wrote) |
| documents-code.js:4320 | `"That fix no longer applies: the text has changed since it was offered."` | b expected (plain) | the target changed or went away since it was offered (a stale offer or a hidden item), not a fault |
| documents-prose.js:339 | `"That text has changed since it was checked."` | b expected (plain) | the target changed or went away since it was offered (a stale offer or a hidden item), not a fault |
| documents-prose.js:668 | `"Save the document first."` | b expected (plain) | a check on what the person entered or picked; says what to fix |
| documents-prose.js:961 | `"This window has no speech voices to read with."` | b expected (plain) | the browser or window lacks, or the person blocked, a capability; nothing in MemoryMap failed |
| documents-prose.js:1006 | `'Reading stopped: ${event.error \|\| "the voice did not answer"}.'` | a fault | the speech engine raised an error event mid-reading |
| documents-prose.js:1021 | `'Reading stopped: ${error && error.message ? error.message : "the voice did not answer"}.'` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| documents.js:832 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| documents.js:842 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| documents.js:856 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| documents.js:1263 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| documents.js:1432 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| documents.js:1855 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| documents.js:2397 | `'${what} is not available here.'` | b expected (plain) | the browser or window lacks, or the person blocked, a capability; nothing in MemoryMap failed |
| documents.js:2866 | `"That section cannot go inside itself."` | b expected (plain) | a check on what the person entered or picked; says what to fix |
| documents.js:6190 | `"Give the document a title first, a block link is named by it."` | b expected (plain) | a check on what the person entered or picked; says what to fix |
| documents.js:6195 | `"Put the caret in a paragraph first."` | b expected (plain) | a check on what the person entered or picked; says what to fix |
| documents.js:6212 | `"That block is not in this document any more."` | b expected (plain) | the target changed or went away since it was offered (a stale offer or a hidden item), not a fault |
| documents.js:9454 | `'Nothing called "${name}" yet.'` | b expected (plain) | an empty state: there is nothing to act on yet |
| documents.js:11207 | `error.message \|\| "Couldn't revert that."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| documents.js:11526 | `"Open a document first."` | b expected (plain) | a check on what the person entered or picked; says what to fix |
| documents.js:11654 | `"Couldn't open that version."` | a fault | fetching a saved version failed |
| documents.js:11704 | `error.message \|\| "Couldn't restore that version."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| documents.js:13352 | `"Full screen is not available in this window."` | b expected (plain) | the browser or window lacks, or the person blocked, a capability; nothing in MemoryMap failed |
| documents.js:13367 | `"Full screen is not available in this window."` | b expected (plain) | the browser or window lacks, or the person blocked, a capability; nothing in MemoryMap failed |
| documents.js:15686 | `"That text has changed, the list is refreshed."` | b expected (plain) | the target changed or went away since it was offered (a stale offer or a hidden item), not a fault |
| documents.js:15709 | `"Nothing left to fix."` | b expected (plain) | an empty state: there is nothing to act on yet |
| documents.js:17412 | `"Save the document first."` | b expected (plain) | a check on what the person entered or picked; says what to fix |
| documents.js:17427 | `(body && body.message) \|\| "No other wordings came back for that one."` | b expected (plain) | an expected situation, not a failure |
| documents.js:17709 | `"The chat isn't available right now."` | a fault | a required element is missing from the page: a UI fault |
| documents.js:17770 | `"Nothing to discuss yet."` | b expected (plain) | an empty state: there is nothing to act on yet |
| documents.js:17772 | `"The chat isn't available right now."` | a fault | a required element is missing from the page: a UI fault |
| documents.js:17850 | `"Nothing to check yet."` | b expected (plain) | an empty state: there is nothing to act on yet |
| documents.js:17852 | `"Nothing to check yet."` | b expected (plain) | an empty state: there is nothing to act on yet |
| documents.js:18067 | `"One word at a time: letters, with an apostrophe or hyphen inside."` | b expected (plain) | a check on what the person entered or picked; says what to fix |
| documents.js:18084 | `"No words found in that file. One word per line."` | b expected (plain) | a check on what the person entered or picked; says what to fix |
| documents.js:18095 | `"The dictionary is empty, so there is nothing to export."` | b expected (plain) | an empty state: there is nothing to act on yet |
| editor.js:2127 | `error.message \|\| "Could not create that."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| entity-page.js:51 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| entity-page.js:58 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| entity-page.js:148 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| entity-page.js:221 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| graph-canvas.js:3427 | `error.message \|\| "Couldn't write that note."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| graph.js:1440 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| graph.js:3563 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| graph.js:3779 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| graph.js:3789 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| graph.js:4149 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| graph.js:4162 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| graph.js:4422 | `"Nothing to export yet."` | b expected (plain) | an empty state: there is nothing to act on yet |
| graph.js:4447 | `error.message \|\| "Couldn't export the graph."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| graph.js:4453 | `"Nothing to export yet."` | b expected (plain) | an empty state: there is nothing to act on yet |
| graph.js:4470 | `error.message \|\| "Couldn't export the graph."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:774 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:784 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:790 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:800 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:818 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:839 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:853 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:862 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:872 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:892 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:925 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:935 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:971 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:983 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:1019 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:1047 | `"A note can't be linked to itself."` | b expected (plain) | a check on what the person entered or picked; says what to fix |
| library.js:1053 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:1560 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:1625 | `'Couldn't restore that note: ${error.message}'` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:1643 | `'Couldn't delete that note: ${error.message}'` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:1801 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:1816 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:1854 | `'${failed} item${failed === 1 ? "" : "s"} couldn't be restored.'` | a fault | a bulk restore partly failed |
| library.js:1900 | `'${failed} item${failed === 1 ? "" : "s"} couldn't be deleted.'` | a fault | a bulk delete partly failed |
| library.js:2436 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:2452 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:2457 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:2461 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:2742 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:3052 | `'Couldn't import “${file.name}”: ${error.message \|\| "the file could not be read."}'` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:3097 | `error.message \|\| "Could not load documents."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:3256 | `error.message \|\| "Couldn't open that document."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:3286 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:3304 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:3363 | `'${failed} document${failed === 1 ? "" : "s"} couldn't be deleted.'` | a fault | a bulk delete partly failed |
| library.js:3943 | `error.message \|\| "Could not clean up that reading."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:3966 | `error.message \|\| "Could not delete that reading."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:4285 | `error.message \|\| "Could not delete that reading."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:4616 | `chosen.said` | b expected (plain) | no text reader is available; the message already says what to turn on |
| library.js:4623 | `"That region couldn't be cut out of the page."` | a fault | cutting the region out of the page image failed |
| library.js:4666 | `error.message \|\| "That region couldn't be read."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:6095 | `chosen.said` | b expected (plain) | no text reader is available; the message already says what to turn on |
| library.js:6233 | `"There is nothing to ask about yet."` | b expected (plain) | an empty state: there is nothing to act on yet |
| library.js:6244 | `"The chat isn't available right now."` | a fault | a required element is missing from the page: a UI fault |
| library.js:6371 | `"There is nothing to copy yet."` | b expected (plain) | an empty state: there is nothing to act on yet |
| library.js:6433 | `error.message \|\| "Couldn't describe that."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:6476 | `error.message \|\| "Could not delete that reading."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:6500 | `error.message \|\| "Could not clean up that reading."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:6528 | `chosen.said` | b expected (plain) | no text reader is available; the message already says what to turn on |
| library.js:6600 | `chosen.said` | b expected (plain) | no text reader is available; the message already says what to turn on |
| library.js:6688 | `error.message \|\| "Couldn't save that."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:6695 | `"There is nothing to save yet."` | b expected (plain) | an empty state: there is nothing to act on yet |
| library.js:6728 | `error.message \|\| "Couldn't save that note."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:7040 | `err.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:7490 | `err.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:7595 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:7802 | `error.message \|\| "Couldn't save that caption."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:7856 | `updated.message \|\| (image._isImage ? "No description was written. Is a vision model r...` | b expected (plain) | an expected situation, not a failure |
| library.js:7867 | `error.message \|\| "Couldn't generate a caption."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:7958 | `error.message \|\| "Couldn't save that text."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:8001 | `error.message \|\| "Couldn't read the text in that image."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:8146 | `error.message \|\| "Couldn't save that text."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:8184 | `error.message \|\| "Couldn't read the text in that image."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:9030 | `'${file.name}: ${error.message}'` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:9065 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:9328 | `err.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:9347 | `'${failed} board${failed === 1 ? "" : "s"} couldn't be deleted.'` | a fault | a bulk delete partly failed |
| library.js:9440 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:9481 | `err.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:9486 | `'${failed} bookmark${failed === 1 ? "" : "s"} couldn't be deleted.'` | a fault | a bulk delete partly failed |
| library.js:9491 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:9500 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:9530 | `err.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:9616 | `error.message \|\| "Couldn't move that bookmark."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:10171 | `"A bookmark needs a URL."` | b expected (plain) | a check on what the person entered or picked; says what to fix |
| library.js:10189 | `error.message \|\| "Couldn't save that bookmark."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:11046 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| lightbox-view.js:138 | `err.message \|\| "Could not delete that reading."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| lightbox-view.js:753 | `"Couldn't save that file."` | a fault | saving the file failed |
| lightbox-view.js:862 | `error.message \|\| "Couldn't save that file."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| lightbox-view.js:894 | `error.message \|\| "Couldn't export that text."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| lightbox-view.js:1118 | `err.message \|\| "Couldn't rename that image."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| lightbox-view.js:1136 | `err.message \|\| "Couldn't delete that image."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| lightbox.js:29 | `error.message \|\| "Atlas could not read this note."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| lightbox.js:70 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| lightbox.js:118 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| lightbox.js:229 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| lightbox.js:265 | `'${file.name}: ${error.message}'` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| lightbox.js:288 | `"Couldn't load the Library gallery."` | a fault | loading the gallery failed |
| lightbox.js:292 | `"Nothing in the Library gallery yet, upload one from Library → Files & Images first."` | b expected (plain) | a check on what the person entered or picked; says what to fix |
| lightbox.js:374 | `error.message \|\| "Couldn't attach that file."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| link-types.js:51 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| link-types.js:61 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| link-types.js:75 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| link-types.js:150 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| link-types.js:170 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| margin-reader.js:90 | `error.message \|\| "Couldn't make that reminder."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| media.js:646 | `"Microphone access was blocked, allow it in your browser."` | b expected (plain) | the browser or window lacks, or the person blocked, a capability; nothing in MemoryMap failed |
| media.js:687 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| media.js:1097 | `"This browser has no text-to-speech voices."` | b expected (plain) | the browser or window lacks, or the person blocked, a capability; nothing in MemoryMap failed |
| menus.js:1133 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| menus.js:1352 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| menus.js:1387 | `error.message \|\| "Couldn't generate a title."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| menus.js:1400 | `error.message \|\| "Couldn't remove the title."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| menus.js:1946 | `err.message \|\| "Couldn't duplicate note."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| menus.js:1956 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| menus.js:2092 | `"Couldn't read this note."` | a fault | reading a note failed |
| model-bench.js:71 | `error.message \|\| "Couldn't switch the chat model."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| model-bench.js:158 | `error.message \|\| "Couldn't stop the bench."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| navigation.js:2707 | `error.message \|\| "Couldn't save that answer."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| navigation.js:2735 | `error.message \|\| "Couldn't change that."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| navigation.js:2754 | `error.message \|\| "Couldn't forget that."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| note-cards.js:147 | `error.message \|\| "Couldn't change the tags."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| note-cards.js:1350 | `error.message \|\| "Couldn't publish that draft."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| note-cards.js:1557 | `err.message \|\| "Failed to remove image"` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| note-cards.js:1636 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| note-cards.js:2293 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| note-cards.js:2300 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| note-cards.js:2336 | `'That ${isDocument ? "document" : "note"} is not on the graph right now: a filter or th...` | b expected (plain) | the target changed or went away since it was offered (a stale offer or a hidden item), not a fault |
| note-edit-panels.js:128 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| note-edit-panels.js:147 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| note-edit-panels.js:185 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| note-edit-panels.js:385 | `"A note needs some text. To remove it, use Move to bin in its menu."` | b expected (plain) | a check on what the person entered or picked; says what to fix |
| note-history.js:307 | `error.message \|\| "Couldn't read what would be undone."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| note-history.js:329 | `error.message \|\| "Couldn't undo that."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| note-panels.js:313 | `error.message \|\| "Couldn't link those notes."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| note-properties.js:44 | `"Couldn't read this note's properties."` | a fault | reading a note's properties failed |
| note-properties.js:146 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| note-properties.js:195 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| note-properties.js:208 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| note-properties.js:222 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| note-properties.js:239 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| note-properties.js:289 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| note-properties.js:296 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| note-properties.js:318 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| notes-list.js:144 | `draftFirst ? "A draft can't be linked to a saved note. Save the draft first." : "A save...` | b expected (plain) | a check on what the person entered or picked; says what to fix |
| notes-list.js:193 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| notes-list.js:3541 | `error.message \|\| "Couldn't update those links."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| ocr-engine.js:204 | `error.message \|\| "That language could not be set."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| onboarding.js:142 | `error.message \|\| "Couldn't start the download."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| onboarding.js:180 | `error.message \|\| "Couldn't add the example notes."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| onboarding.js:335 | `error.message \|\| "Couldn't save your console view choice."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| phone-shell.js:321 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| phone-shell.js:2025 | `error.message \|\| "Couldn't open the exports folder."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| phone-shell.js:2065 | `error.message \|\| 'Couldn't fetch ${file.filename}.'` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| pick-row.js:22 | `shape.full \|\| "That's as many as one message can carry."` | b expected (plain) | a limit the app sets on purpose; says what to do instead |
| selection.js:99 | `error.message \|\| 'Couldn't add ${what} to the note.'` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| selection.js:702 | `error.message \|\| "Couldn't read a reminder from that."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| selection.js:843 | `"Extracting notes needs the local AI."` | b expected (plain) | a feature that needs the AI, a model or a setting that is off; says where to turn it on |
| settings-controls.js:113 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings-controls.js:128 | `error.message \|\| "Couldn't make a new certificate."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings-controls.js:226 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings-controls.js:252 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings-controls.js:266 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings-controls.js:302 | `(status && status.textContent) \|\| "Couldn't apply the update."` | a fault | the update step failed; the text is the step's own error |
| settings-controls.js:375 | `status.textContent \|\| "Couldn't install that version."` | a fault | the install step failed; the text is the step's own error |
| settings-controls.js:399 | `error.message \|\| "Couldn't switch view."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings-controls.js:452 | `error.message \|\| "Couldn't open the exports folder."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings-controls.js:589 | `err.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings-controls.js:650 | `"No skills found in that file."` | b expected (plain) | a check on what the person entered or picked; says what to fix |
| settings-controls.js:656 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings-controls.js:674 | `"No personas found in that file."` | b expected (plain) | a check on what the person entered or picked; says what to fix |
| settings-controls.js:689 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings-controls.js:894 | `error.message \|\| "Couldn't save the backup."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings-controls.js:1146 | `e.message \|\| "Couldn't save that window."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings-controls.js:1241 | `error.message \|\| 'Couldn't switch to ${EMBEDDING_FALLBACK_MODEL}.'` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings-controls.js:1263 | `error.message \|\| "Couldn't reset those models."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings-controls.js:1298 | `error.message \|\| "Couldn't set that model."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings-controls.js:1317 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings-controls.js:1336 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings-controls.js:1465 | `"Restart isn't available in this build, close and reopen MemoryMap by hand."` | b expected (plain) | an action refused because of the current state (a job is running, a model is in use, build limits) |
| settings-controls.js:1468 | `error.message \|\| "Couldn't restart."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings-controls.js:1513 | `error.message \|\| "Couldn't save that folder."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings-data.js:177 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings-data.js:187 | `error.message \|\| "Couldn't delete that backup."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings-models.js:179 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings-models.js:189 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings-models.js:211 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings-models.js:223 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings-models.js:247 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings-models.js:269 | `"Couldn't copy it from here."` | b expected (plain) | the browser refused clipboard access; nothing in MemoryMap failed |
| settings-models.js:280 | `'${state.installed} is in use for ${state.roles.join(" and ")}. Choose another model th...` | b expected (plain) | an action refused because of the current state (a job is running, a model is in use, build limits) |
| settings-packages.js:172 | `body.running ? busy : "Nothing here is installed yet."` | b expected (plain) | an action refused because of the current state (a job is running, a model is in use, build limits) |
| settings-packages.js:182 | `body.running ? busy : "Nothing here is installed yet."` | b expected (plain) | an action refused because of the current state (a job is running, a model is in use, build limits) |
| settings-packages.js:342 | `body.running ? busy : extra.unavailable` | b expected (plain) | an action refused because of the current state (a job is running, a model is in use, build limits) |
| settings-packages.js:349 | `busy` | b expected (plain) | an action refused because of the current state (a job is running, a model is in use, build limits) |
| settings-panes.js:882 | `error.message \|\| "Couldn't save that setting."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings-panes.js:967 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings-wiring.js:1196 | `"Couldn't read the clipboard here. Paste into Capture instead."` | b expected (plain) | the browser or window lacks, or the person blocked, a capability; nothing in MemoryMap failed |
| settings-wiring.js:1199 | `"There is no text on the clipboard to save."` | b expected (plain) | the browser or window lacks, or the person blocked, a capability; nothing in MemoryMap failed |
| settings-wiring.js:1201 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings-wiring.js:1843 | `"Only images can be attached to a chat message right now."` | b expected (plain) | an input check: that kind of file cannot be attached here |
| settings-wiring.js:1873 | `"Only images can be attached to a chat message right now."` | b expected (plain) | an input check: that kind of file cannot be attached here |
| settings-wiring.js:1971 | `'${file.name}: ${error.message}'` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings-wiring.js:2075 | `err.message \|\| 'Couldn't upload "${file.name}".'` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings.js:1129 | `"Nothing to copy: the filters above are hiding every record."` | b expected (plain) | an empty state: there is nothing to act on yet |
| settings.js:1167 | `error.message \|\| "Couldn't clear the server log."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings.js:1193 | `error.message \|\| "Couldn't build the support bundle."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings.js:1881 | `"Give the look a name first."` | b expected (plain) | a check on what the person entered or picked; says what to fix |
| settings.js:1887 | `'You can keep ${MAX_CUSTOM_THEMES} saved looks: delete one first.'` | b expected (plain) | a limit the app sets on purpose; says what to do instead |
| settings.js:2016 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings.js:3122 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings.js:3460 | `"Couldn't save that setting."` | a fault | saving a setting failed |
| settings.js:3505 | `"Couldn't reset that setting."` | a fault | resetting a setting failed |
| settings.js:3524 | `"Couldn't reset those settings."` | a fault | resetting settings failed |
| settings.js:3868 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings.js:3916 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings.js:4055 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings.js:4065 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings.js:4086 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings.js:4105 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| settings.js:4115 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| sheets-selects.js:1614 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| sheets-selects.js:1696 | `"An empty answer isn't a correction: delete the message instead."` | b expected (plain) | a check on what the person entered or picked; says what to fix |
| sheets-selects.js:1706 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| shell-reminders.js:1135 | `'Couldn't delete ${failed} of the reminders.'` | a fault | a bulk delete partly failed |
| shell-reminders.js:1143 | `'Couldn't bring back ${failed} of the reminders.'` | a fault | a bulk restore partly failed |
| shell-reminders.js:1150 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| shell-reminders.js:1259 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| shell-reminders.js:1586 | `"A reminder needs text and a time."` | b expected (plain) | a check on what the person entered or picked; says what to fix |
| skills.js:274 | `'“${skill.name}” needs ${item.label \|\| item.name}.'` | b expected (plain) | a check on what the person entered or picked; says what to fix |
| skills.js:896 | `error.message \|\| "Couldn't save that. Try again."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| skills.js:1098 | `error.message \|\| "Couldn't download that."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| skills.js:1140 | `error.message \|\| "Couldn't open the exports folder."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| skills.js:1158 | `'Couldn't save ${filename}: ${error.message}'` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| skills.js:1188 | `"That file isn't valid JSON."` | b expected (plain) | a check on what the person entered or picked; says what to fix |
| skills.js:1279 | `"Tick some notes first."` | b expected (plain) | a check on what the person entered or picked; says what to fix |
| spaces-find.js:351 | `error.message \|\| "Couldn't change that space."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| spaces-find.js:613 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| status.js:289 | `error.message \|\| "Couldn't save that."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| status.js:1436 | `error.message \|\| "Couldn't undo that."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| status.js:1456 | `error.message \|\| "Couldn't redo that."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| suggestions-inbox.js:252 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| suggestions-inbox.js:291 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| suggestions-inbox.js:413 | `error.message \|\| "Couldn't link these notes."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| suggestions-inbox.js:426 | `error.message \|\| "Couldn't dismiss this pair."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| suggestions-inbox.js:503 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| suggestions-inbox.js:513 | `"Marked what I could, Atlas isn't running, so none could be put into words yet."` | b expected (plain) | a feature that needs the AI, a model or a setting that is off; says where to turn it on |
| suggestions-inbox.js:525 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| suggestions-inbox.js:557 | `"Atlas isn't running, so no reasons could be guessed."` | b expected (plain) | a feature that needs the AI, a model or a setting that is off; says where to turn it on |
| suggestions-inbox.js:658 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| tag-manager.js:70 | `error.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| tag-manager.js:752 | `"Type a tag to add, or tick one to remove."` | b expected (plain) | a check on what the person entered or picked; says what to fix |
| update-dialogs.js:103 | `error.message \|\| "Couldn't save that answer."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| update-dialogs.js:216 | `progress.textContent \|\| "Couldn't apply the update."` | a fault | the update step failed; the text is the step's own error |
| usage-ledger.js:83 | `"Couldn't copy here. Select the command and copy it."` | b expected (plain) | the browser refused clipboard access; nothing in MemoryMap failed |
| usage-ledger.js:92 | `error.message \|\| "Couldn't clear the counts."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard-history.js:110 | `error.message \|\| "The board's history could not be read."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard-history.js:180 | `error.message \|\| "That moment could not be read."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard-history.js:237 | `error.message \|\| "The board could not be put back."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard-interchange.js:460 | `"No flowchart found. Start with a line like: flowchart TD"` | b expected (plain) | a check on what the person entered or picked; says what to fix |
| whiteboard-interchange.js:560 | `"That SVG was not exported from a board here, so it has no board inside it. Insert it a...` | b expected (plain) | a check on what the person entered or picked; says what to fix |
| whiteboard-library.js:248 | `"That icon is not in the library's set."` | a fault | a stored library entry names an icon the set does not have: bad data |
| whiteboard-library.js:634 | `err.message \|\| "Couldn't place that."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard-library.js:690 | `err.message \|\| "Couldn't start a board from that."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard-library.js:800 | `err.message \|\| "Couldn't change that."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard-library.js:928 | `err.message \|\| "Couldn't save that to the library."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard-library.js:1109 | `err.message \|\| "Couldn't export that library."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard-library.js:1115 | `"That file is too large to be a library (8 MB at most)."` | b expected (plain) | a limit the app sets on purpose; says what to do instead |
| whiteboard-library.js:1120 | `"That file is not a MemoryMap library."` | b expected (plain) | a check on what the person entered or picked; says what to fix |
| whiteboard-library.js:1128 | `err.message \|\| "Couldn't import that library."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard-map.js:881 | `err.message \|\| "Couldn't change how this map draws."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard-map.js:914 | `err.message \|\| "Couldn't reset the topics."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard-map.js:2249 | `err.message \|\| "Couldn't change the numbering."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard-map.js:2513 | `"That topic's link is not a web address."` | b expected (plain) | a check on what the person entered or picked; says what to fix |
| whiteboard-map.js:2782 | `err.message \|\| "Couldn't move that branch."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard-map.js:4062 | `err.message \|\| "Couldn't move that topic under the new one."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard-map.js:4126 | `err.message \|\| "Couldn't add that node."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard-map.js:4283 | `err.message \|\| "Couldn't paste that onto the map."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard-map.js:4361 | `err.message \|\| "Couldn't read this map."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard-map.js:4377 | `err.message \|\| "Couldn't make that document."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard-map.js:4490 | `err.message \|\| "Couldn't add that node."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard-map.js:4682 | `err.message \|\| "Couldn't move that node."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard-map.js:4828 | `err.message \|\| "Couldn't clear the map."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard-map.js:4862 | `err.message \|\| "Couldn't delete that."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard-map.js:4959 | `err.message \|\| "Couldn't restore that node."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard-map.js:4999 | `err.message \|\| "Couldn't restore a link."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard-map.js:6322 | `"A topic's link has to be an http, https or mailto address."` | b expected (plain) | a check on what the person entered or picked; says what to fix |
| whiteboard-map.js:6367 | `"That file is not a picture."` | b expected (plain) | the browser or window lacks, or the person blocked, a capability; nothing in MemoryMap failed |
| whiteboard-map.js:6384 | `err.message \|\| "Couldn't add that picture."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard-map.js:6914 | `'That branch has ${subtree.length} topics: copying stops at ${WB_MAP_COPY_MAX}.'` | b expected (plain) | a limit the app sets on purpose; says what to do instead |
| whiteboard-map.js:7037 | `err.message \|\| "Couldn't move that branch up."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard-map.js:7065 | `err.message \|\| "Couldn't cut that topic free."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard-map.js:7084 | `err.message \|\| "Couldn't put it back."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard-map.js:7541 | `err.message \|\| "Couldn't turn that cross-link around."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard-map.js:7561 | `'"${wbMapLabel(source)}" is already under "${wbMapLabel(target)}": turn the cross-link ...` | b expected (plain) | an action refused because of the current state (a job is running, a model is in use, build limits) |
| whiteboard-map.js:7569 | `err.message \|\| "The branch was made, but the cross-link is still there."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard-map.js:7583 | `err.message \|\| "Couldn't cut that cross-link."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard-map.js:7614 | `err.message \|\| "Couldn't turn that line around."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard-map.js:7737 | `err.message \|\| "Couldn't change the layout."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard-map.js:7956 | `"A summary covers topics side by side under one parent."` | b expected (plain) | a check on what the person entered or picked; says what to fix |
| whiteboard-map.js:8591 | `"That day has gone: pick a later due date for a reminder."` | b expected (plain) | a check on what the person entered or picked; says what to fix |
| whiteboard-map.js:8598 | `error.message \|\| "Couldn't set that reminder."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard-map.js:8894 | `err.message \|\| "Couldn't make that map."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard-map.js:8938 | `err.message \|\| "This branch could not be summarised."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard-map.js:8965 | `err.message \|\| "No branches could be suggested."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard-map.js:9053 | `err.message \|\| "The branches could not be added."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard.js:1087 | `"The default board keeps the theme's look. Make a board of your own to give it one."` | b expected (plain) | a check on what the person entered or picked; says what to fix |
| whiteboard.js:1097 | `err.message \|\| "Couldn't change the background."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard.js:4319 | `err.message \|\| "Couldn't save that."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard.js:5839 | `err.message \|\| "Couldn't make that copy."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard.js:7930 | `"Couldn't undo that."` | a fault | undo threw an exception |
| whiteboard.js:7946 | `"Couldn't redo that."` | a fault | redo threw an exception |
| whiteboard.js:7965 | `err.message \|\| "Couldn't add that to the board."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard.js:8484 | `'A thread holds ${WB_COMMENTS_MAX} comments. Delete one first.'` | b expected (plain) | a limit the app sets on purpose; says what to do instead |
| whiteboard.js:8819 | `err.message \|\| "Couldn't delete that board."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard.js:9490 | `error.message \|\| "Couldn't propose a map from those notes."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard.js:9513 | `error.message \|\| "Couldn't create that map."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard.js:9588 | `"There is nothing in the outline to build."` | b expected (plain) | an empty state: there is nothing to act on yet |
| whiteboard.js:9655 | `"Couldn't read that file."` | a fault | reading the chosen file threw |
| whiteboard.js:9659 | `"That file is empty."` | b expected (plain) | a check on what the person entered or picked; says what to fix |
| whiteboard.js:9663 | `'That outline is ${content.length.toLocaleString()} characters: the limit is ${WB_MAX_I...` | b expected (plain) | a limit the app sets on purpose; says what to do instead |
| whiteboard.js:9692 | `error.message \|\| "Couldn't import that outline."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard.js:9867 | `"Allow pop-ups to export as PDF, it opens Print, then Save as PDF."` | b expected (plain) | the browser or window lacks, or the person blocked, a capability; nothing in MemoryMap failed |
| whiteboard.js:10155 | `err.message \|\| "Couldn't export the board."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard.js:11029 | `err.message \|\| "Couldn't set that background image."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard.js:11920 | `"The default board cannot change kind. Make a new board to start a mind map."` | b expected (plain) | a check on what the person entered or picked; says what to fix |
| whiteboard.js:11930 | `error.message \|\| "That board could not be changed."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard.js:13322 | `error.message \|\| "The connector could not be made."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard.js:13569 | `err.message \|\| "Couldn't add that image."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard.js:13867 | `"Drop a note from the Library onto the board. That was not a note."` | b expected (plain) | a check on what the person entered or picked; says what to fix |
| whiteboard.js:13931 | `'Could not add that note to the board: ${why}'` | a fault | creating the node on the server failed |
| whiteboard.js:14144 | `err.message \|\| "Couldn't rename that board."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard.js:14196 | `err.message \|\| "Couldn't create that board."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard.js:14260 | `err.message \|\| "Couldn't add the root topic."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard.js:14296 | `err.message \|\| "Couldn't create that board."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard.js:18612 | `"Drop an outline to import it: OPML, FreeMind, XMind, Markdown or plain text."` | b expected (plain) | a check on what the person entered or picked; says what to fix |
| whiteboard.js:18956 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard.js:18973 | `e.message` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| whiteboard.js:19221 | `err.message \|\| "Couldn't create that map."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| wiring.js:738 | `error.message \|\| "Couldn't fork this conversation."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| wiring.js:780 | `error.message \|\| "Couldn't rename this conversation."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| wiring.js:1054 | `error.message \|\| "Couldn't unpin the graph."` | a fault | a failed request or exception; a 4xx answer shows plain at run time (toast.refused), a 5xx or network failure stays red |
| library.js:6411 | `described?.caption ? ... : described?.message \|\| "Nothing was written for that page."` | b expected (plain) | a describe that wrote nothing is the model's answer, not a fault |
