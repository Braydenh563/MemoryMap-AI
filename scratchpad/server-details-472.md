# Server detail strings (INBOX 472)

302 literals, 179 to rewrite; 45 computed at run time (read by hand).

| where | status | verdict | text |
| --- | --- | --- | --- |
| app.py:561 | ? | computed | '<computed> detail' |
| app.py:617 | 500 | rewrite: no final full stop | 'Internal error' |
| app.py:999 | 403 | keep | "Not this instance's token." |
| edit_conflicts.py:64 | 409 | keep | 'This {} was changed in another window since you started editing it.' |
| routes_ask_history.py:95 | 404 | rewrite: no final full stop | 'No such question in your history' |
| routes_ask_history.py:157 | 404 | rewrite: no final full stop | 'No such question in your history' |
| routes_ask_history.py:165 | 404 | rewrite: no final full stop | 'No such question in your history' |
| routes_auth.py:355 | 429 | rewrite: no final full stop | 'Too many wrong passwords, try again in {}s' |
| routes_auth.py:422 | 401 | rewrite: no final full stop | 'Locked: unlock first' |
| routes_auth.py:447 | 401 | rewrite: no final full stop | 'Locked: unlock first' |
| routes_auth.py:476 | 400 | rewrite: no final full stop | 'A password is already set' |
| routes_auth.py:501 | 400 | rewrite: no final full stop | 'No password set yet, use setup' |
| routes_auth.py:504 | 401 | rewrite: no final full stop | 'Wrong password' |
| routes_auth.py:577 | 403 | rewrite: no final full stop | 'Enter your password to unlock' |
| routes_auth.py:615 | 400 | rewrite: no final full stop | 'No password set yet, use setup' |
| routes_auth.py:618 | 401 | rewrite: no final full stop | 'Wrong password' |
| routes_auth.py:664 | 400 | rewrite: no final full stop | 'No password set yet, use setup' |
| routes_auth.py:673 | 401 | rewrite: no final full stop | "That isn't your current password" |
| routes_auth.py:713 | 400 | rewrite: no final full stop | 'Set a password first' |
| routes_auth.py:722 | 401 | rewrite: no final full stop | "That isn't your current password" |
| routes_auth.py:804 | 400 | rewrite: no final full stop | 'No password set yet, use setup' |
| routes_auth.py:806 | 401 | rewrite: no final full stop | "That isn't your current password" |
| routes_auth.py:808 | 400 | rewrite: no final full stop | "That's already your password" |
| routes_auth.py:821 | 409 | keep | 'Unlock the app before changing your password, so your private notes can be moved across to it.' |
| routes_auth.py:826 | 500 | rewrite: no final full stop | "Couldn't move your private notes to the new password" |
| routes_auth.py:885 | 400 | rewrite: no final full stop | 'No password set yet, use setup' |
| routes_auth.py:887 | 401 | rewrite: no final full stop | "That isn't your current password" |
| routes_auth.py:890 | 400 | rewrite: no final full stop | "There's no vault to rotate yet" |
| routes_auth.py:898 | 409 | keep | 'Unlock the app before rotating the encryption key.' |
| routes_auth.py:926 | 500 | keep | "Couldn't read one of your private notes with the current key: nothing was changed." |
| routes_auth.py:936 | 500 | keep | "Re-encryption didn't verify: nothing was changed." |
| routes_backups.py:106 | 507 | keep | "Couldn't save the backup: {}." |
| routes_backups.py:141 | 404 | computed | '<computed> str(exc)' |
| routes_backups.py:159 | 404 | rewrite: no final full stop | 'Backup not found' |
| routes_bookmarks.py:70 | 422 | rewrite: no final full stop | 'A bookmark needs a URL' |
| routes_bookmarks.py:79 | 422 | keep | "URL scheme '{}:' is not allowed. Allowed schemes: {}." |
| routes_bookmarks.py:106 | 404 | rewrite: no final full stop | 'Bookmark not found' |
| routes_categories.py:103 | 400 | rewrite: no final full stop | 'That category no longer exists' |
| routes_categories.py:118 | 400 | rewrite: no final full stop | "Those categories are in different spaces, so they can't be merged" |
| routes_categories.py:162 | 400 | computed | '<computed> str(exc)' |
| routes_categories.py:184 | 400 | computed | '<computed> str(exc)' |
| routes_categories.py:337 | 400 | computed | '<computed> str(exc)' |
| routes_categories.py:353 | 400 | rewrite: no final full stop | 'A category cannot be moved into itself' |
| routes_categories.py:358 | 400 | computed | '<computed> str(exc)' |
| routes_categories.py:363 | 400 | computed | '<computed> str(exc)' |
| routes_chat.py:584 | 404 | rewrite: no final full stop | 'No skill called “{}”' |
| routes_chat.py:589 | 422 | rewrite: no final full stop | '“{}” needs {} before it can run' |
| routes_chat.py:616 | 422 | computed | '<computed> str(exc)' |
| routes_chat.py:2150 | 503 | computed | '<computed> str(exc)' |
| routes_chat.py:2154 | 502 | computed | '<computed> str(exc)' |
| routes_chat.py:2172 | 404 | rewrite: no final full stop | "Unknown tool '{}'" |
| routes_chat.py:2175 | 400 | computed | "<computed> result['error']" |
| routes_conversations.py:206 | 404 | rewrite: no final full stop | 'Conversation not found' |
| routes_conversations.py:604 | 404 | rewrite: no final full stop | 'Turn not found' |
| routes_conversations.py:823 | 404 | rewrite: no final full stop | 'Turn not found' |
| routes_documents.py:208 | 404 | rewrite: no final full stop | 'Document not found' |
| routes_documents.py:239 | 404 | rewrite: no final full stop | 'Bookmark not found' |
| routes_documents.py:313 | 400 | computed | '<computed> str(error)' |
| routes_documents.py:508 | 415 | keep | "Can't read a {}, this takes documents, spreadsheets, PDFs, and text or code files." |
| routes_documents.py:524 | 413 | rewrite: no final full stop | 'File is larger than 50 MB' |
| routes_documents.py:555 | 422 | computed | "<computed> viewed.message or 'There was no readable text in that file.'" |
| routes_documents.py:779 | 404 | rewrite: no final full stop | 'Note not found' |
| routes_documents.py:1104 | 400 | keep | 'A bundle is for a markdown document; this one is {}. Use the plain download instead.' |
| routes_documents.py:1139 | 400 | keep | 'A Word export is for a markdown document; this one is {}.' |
| routes_documents.py:1144 | 501 | keep | 'This install has no Word exporter: python-docx is not installed. Turn it on in Settings, optional extras, “Export to Word”. Markdown, the zip bundle and HTML are available now.' |
| routes_documents.py:1181 | 400 | keep | 'Say what to write.' |
| routes_documents.py:1201 | 400 | rewrite: no final full stop | "There's nothing to edit yet" |
| routes_documents.py:1208 | 400 | keep | 'Say what to remove, or select it first.' |
| routes_documents.py:1228 | 400 | keep | "Say what you'd like changed." |
| routes_documents.py:1271 | 400 | keep | "There's nothing to check yet." |
| routes_documents.py:1400 | 404 | rewrite: no final full stop | 'No revision with that id' |
| routes_documents.py:1424 | 404 | rewrite: no final full stop | 'No revision with that id' |
| routes_documents.py:1545 | 404 | rewrite: no final full stop | 'No AI edit with that id' |
| routes_documents.py:1547 | 404 | rewrite: no final full stop | 'No AI edit with that id' |
| routes_drafts.py:86 | 400 | rewrite: no final full stop | 'Write a thought first' |
| routes_drafts.py:122 | 400 | rewrite: no final full stop | 'Write a thought first' |
| routes_duplicates.py:51 | 404 | rewrite: no final full stop | 'Note {} not found' |
| routes_duplicates.py:54 | 400 | rewrite: no final full stop | "Private notes can't be merged this way" |
| routes_duplicates.py:58 | 400 | rewrite: no final full stop | 'Pick at least two notes to merge' |
| routes_entries.py:263 | 404 | rewrite: no final full stop | 'Entry not found' |
| routes_entries.py:730 | 422 | rewrite: no final full stop | 'A journal date is written as YYYY-MM-DD' |
| routes_entries.py:825 | 404 | rewrite: no final full stop | 'Nothing written on that day yet' |
| routes_entries.py:899 | 422 | rewrite: starts lowercase; no final full stop | 'action must be keep or fallback' |
| routes_entries.py:1276 | 400 | keep | "There's no text to improve." |
| routes_entries.py:1280 | 400 | keep | 'Say what you want changed, then try again.' |
| routes_entries.py:1285 | 503 | keep | "The AI isn't available right now (Ollama doesn't seem to be running)." |
| routes_entries.py:1296 | 502 | computed | '<computed> str(exc)' |
| routes_entries.py:1751 | 404 | rewrite: no final full stop | 'Bookmark not found' |
| routes_entries.py:1829 | 422 | rewrite: starts lowercase; no final full stop | 'boards must be one of {}' |
| routes_entries.py:1858 | 503 | keep | "Semantic search isn't ready yet: the embedding model is still loading." |
| routes_entries.py:1983 | 404 | rewrite: no final full stop | 'Entry not found' |
| routes_entries.py:2043 | 404 | rewrite: no final full stop | 'Entry not found' |
| routes_entries.py:2182 | 400 | rewrite: no final full stop | 'Only notes in the recycle bin can be permanently deleted' |
| routes_entries.py:2550 | 404 | rewrite: no final full stop | 'That version no longer exists' |
| routes_entries.py:2560 | 410 | rewrite: no final full stop | 'That version is no longer kept: changes older than the history window keep the record of what happened, not the text' |
| routes_entries.py:2568 | 400 | rewrite: no final full stop | "That event did not change the note's text" |
| routes_entries.py:2608 | 404 | rewrite: no final full stop | 'That version no longer exists' |
| routes_entries.py:2633 | 409 | keep | "Unlock the app first, the encryption key isn't loaded." |
| routes_entries.py:2660 | 400 | keep | "Make this note readable first, private notes can't be re-titled here." |
| routes_entries.py:2664 | 400 | keep | "There's no text to title yet." |
| routes_entries.py:2668 | 503 | keep | "The AI isn't available right now (Ollama doesn't seem to be running)." |
| routes_entries.py:2673 | 502 | computed | '<computed> str(exc)' |
| routes_entries.py:2675 | 502 | keep | "The AI didn't return a usable title." |
| routes_entries.py:2697 | 400 | keep | "Make this note readable first, private notes can't be edited here." |
| routes_entries.py:2948 | 400 | keep | "A draft can't be linked to a saved note. Save the draft first." |
| routes_entries.py:2951 | 400 | rewrite: no final full stop | 'Already linked (or tried to link an entry to itself)' |
| routes_entries.py:2963 | 404 | rewrite: no final full stop | 'Link not found' |
| routes_entries.py:2978 | 404 | rewrite: no final full stop | 'Link not found' |
| routes_entries.py:2986 | 500 | keep | "Couldn't save that reason." |
| routes_entries.py:2997 | 404 | rewrite: no final full stop | 'Link not found' |
| routes_entries.py:3002 | 404 | rewrite: no final full stop | 'Notes not found' |
| routes_entries.py:3009 | 400 | keep | "Make both notes readable first, private notes can't be sent to the AI." |
| routes_entries.py:3022 | 500 | keep | "Couldn't generate a reason right now." |
| routes_entries.py:3057 | 400 | computed | '<computed> str(exc)' |
| routes_entries.py:3101 | 400 | rewrite: no final full stop | "'{}' is used by more than one note" |
| routes_files.py:101 | 415 | keep | "'{}' can't be attached. Images, PDFs, office documents, text and code files are supported, video and audio attachments aren't yet." |
| routes_files.py:133 | 413 | rewrite: no final full stop | 'File is larger than 50 MB' |
| routes_files.py:161 | 404 | rewrite: no final full stop | 'Attachment not found' |
| routes_files.py:169 | 404 | rewrite: no final full stop | 'File is missing from disk' |
| routes_files.py:449 | 404 | rewrite: no final full stop | 'File is missing from disk' |
| routes_files.py:460 | 409 | computed | '<computed> reason' |
| routes_files.py:519 | 409 | keep | "The AI model isn't running." |
| routes_files.py:533 | 415 | keep | 'There is no readable text in this file to describe.' |
| routes_files.py:538 | 409 | keep | "The AI model isn't running." |
| routes_files.py:543 | 409 | keep | 'No installed model reports it can see images, install or pick one in Settings → Models.' |
| routes_files.py:679 | 409 | computed | '<computed> edit_message' |
| routes_files.py:724 | 422 | keep | 'Not a PDF.' |
| routes_files.py:727 | 404 | rewrite: no final full stop | 'File is missing from disk' |
| routes_files.py:759 | 404 | keep | 'Not a PDF.' |
| routes_files.py:762 | 404 | rewrite: no final full stop | 'File is missing from disk' |
| routes_files.py:765 | 404 | keep | "That page doesn't exist." |
| routes_files.py:831 | 404 | keep | 'Not an HTML file.' |
| routes_files.py:834 | 404 | rewrite: no final full stop | 'File is missing from disk' |
| routes_files.py:901 | 403 | keep | "This file is on a private note and can't be renamed until the note is readable." |
| routes_files.py:906 | 422 | computed | '<computed> str(exc)' |
| routes_files.py:908 | 409 | computed | '<computed> str(exc)' |
| routes_files.py:963 | 422 | keep | "That filename can't be used." |
| routes_files.py:1006 | 422 | keep | "That filename can't be used." |
| routes_files.py:1027 | 422 | keep | "That file can't be used." |
| routes_files.py:1037 | 422 | keep | "That file couldn't be read." |
| routes_files.py:1039 | 413 | keep | 'That file is too large to save.' |
| routes_files.py:1121 | 404 | keep | 'That export is no longer there.' |
| routes_files.py:1140 | 409 | keep | 'Only the desktop app can open a file manager window.' |
| routes_files.py:1160 | 500 | rewrite: no final full stop | "Couldn't open {}: {}" |
| routes_files.py:1209 | 415 | keep | "Only images and PDFs can be dropped in here. Use the note's attachments for anything else." |
| routes_files.py:1225 | 413 | rewrite: no final full stop | 'File is larger than 50 MB' |
| routes_files.py:1498 | 404 | keep | 'No upload by that name.' |
| routes_files.py:1557 | 404 | keep | 'No upload by that name.' |
| routes_files.py:1560 | 404 | keep | 'That file is no longer on disk.' |
| routes_files.py:1582 | 404 | keep | 'No upload by that name.' |
| routes_files.py:1585 | 404 | keep | 'That file is no longer on disk.' |
| routes_files.py:1604 | 422 | keep | 'Not a PDF.' |
| routes_files.py:1647 | 404 | keep | 'Not a PDF.' |
| routes_files.py:1651 | 404 | keep | "That page doesn't exist." |
| routes_files.py:1723 | 404 | rewrite: no final full stop | 'No upload with that id' |
| routes_files.py:1754 | 404 | rewrite: no final full stop | 'No upload with that id' |
| routes_files.py:1758 | 422 | computed | '<computed> str(exc)' |
| routes_files.py:1810 | 404 | rewrite: no final full stop | 'No upload with that id' |
| routes_files.py:1842 | 409 | keep | "The AI model isn't running." |
| routes_files.py:1849 | 415 | keep | 'There is no readable text in this file to describe.' |
| routes_files.py:1859 | 409 | keep | "The AI model isn't running." |
| routes_files.py:1864 | 409 | keep | 'No installed model reports it can see images, install or pick one in Settings → Models.' |
| routes_files.py:1916 | 404 | rewrite: no final full stop | 'No upload with that id' |
| routes_files.py:1918 | 415 | keep | 'Only images can be read this way.' |
| routes_files.py:1931 | 409 | computed | '<computed> reason' |
| routes_files.py:2410 | 404 | rewrite: no final full stop | 'No upload with that id' |
| routes_files.py:2413 | 415 | keep | 'Only images and PDFs can be read this way.' |
| routes_files.py:2416 | 404 | keep | 'That file is no longer on disk.' |
| routes_files.py:2444 | 415 | keep | 'Only images and PDFs can be read this way.' |
| routes_files.py:2447 | 404 | rewrite: no final full stop | 'File is missing from disk' |
| routes_files.py:2536 | 409 | keep | "The AI model isn't running." |
| routes_files.py:2541 | 409 | keep | 'No installed model reports it can see images, install or pick one in Settings → Models.' |
| routes_files.py:2619 | 400 | keep | 'Unknown reader {}: expected one of {}.' |
| routes_files.py:2919 | 409 | keep | "The AI model isn't running." |
| routes_files.py:2924 | 409 | keep | 'No installed model reports it can see images, install or pick one in Settings → Models.' |
| routes_files.py:2977 | 409 | computed | '<computed> reason' |
| routes_files.py:3089 | 422 | computed | '<computed> str(exc)' |
| routes_files.py:3234 | 415 | keep | 'Only PDFs are read by page range.' |
| routes_files.py:3237 | 404 | rewrite: no final full stop | 'File is missing from disk' |
| routes_files.py:3250 | 404 | rewrite: no final full stop | 'No upload with that id' |
| routes_files.py:3252 | 415 | keep | 'Only PDFs are read by page range.' |
| routes_files.py:3255 | 404 | keep | 'That file is no longer on disk.' |
| routes_files.py:3269 | 415 | keep | 'Only PDF pages are read one at a time.' |
| routes_files.py:3272 | 404 | rewrite: no final full stop | 'File is missing from disk' |
| routes_files.py:3284 | 404 | rewrite: no final full stop | 'No upload with that id' |
| routes_files.py:3286 | 415 | keep | 'Only PDF pages are read one at a time.' |
| routes_files.py:3289 | 404 | keep | 'That file is no longer on disk.' |
| routes_files.py:3339 | 413 | keep | 'That region is too large to read.' |
| routes_files.py:3341 | 400 | keep | 'That region came through empty.' |
| routes_files.py:3343 | 415 | keep | 'A region has to be sent as a PNG.' |
| routes_files.py:3366 | 400 | keep | "Unknown mode {}: expected 'read' or 'describe'." |
| routes_files.py:3374 | 409 | computed | '<computed> reason' |
| routes_files.py:3377 | 409 | keep | "The AI model isn't running." |
| routes_files.py:3391 | 409 | keep | 'No installed model reports it can see images, install or pick one in Settings → Models.' |
| routes_files.py:3459 | 404 | rewrite: no final full stop | 'No upload with that id' |
| routes_files.py:3477 | 415 | keep | 'Only PDF pages are described one at a time.' |
| routes_files.py:3480 | 404 | rewrite: no final full stop | 'File is missing from disk' |
| routes_files.py:3492 | 404 | rewrite: no final full stop | 'No upload with that id' |
| routes_files.py:3494 | 415 | keep | 'Only PDF pages are described one at a time.' |
| routes_files.py:3497 | 404 | keep | 'That file is no longer on disk.' |
| routes_files.py:3523 | 404 | rewrite: no final full stop | 'No upload with that id' |
| routes_files.py:3583 | 404 | rewrite: no final full stop | 'No upload with that id' |
| routes_files.py:3639 | 404 | rewrite: no final full stop | 'No upload with that id' |
| routes_files.py:3701 | 404 | rewrite: no final full stop | 'No upload with that id' |
| routes_files.py:3703 | 415 | keep | 'Only images can be read this way.' |
| routes_files.py:3732 | 409 | keep | "The AI model isn't running." |
| routes_files.py:3737 | 409 | keep | 'No installed model reports it can see images, install or pick one in Settings → Models.' |
| routes_files.py:3769 | 404 | rewrite: no final full stop | 'Media file not found' |
| routes_files.py:3772 | 404 | rewrite: no final full stop | 'Media file not found' |
| routes_graph.py:1013 | 404 | keep | 'No such note.' |
| routes_graph.py:1016 | 400 | keep | 'A pin needs both x and y, or neither.' |
| routes_learned.py:64 | 422 | computed | '<computed> str(exc)' |
| routes_learned.py:193 | 422 | computed | '<computed> str(exc)' |
| routes_learned.py:206 | 400 | rewrite: starts lowercase; no final full stop | 'pass confirm: true to forget everything learned' |
| routes_learned.py:263 | 404 | rewrite: starts lowercase; no final full stop | 'no such derived fact' |
| routes_learned.py:272 | 404 | rewrite: starts lowercase; no final full stop | 'no such derived fact' |
| routes_learned.py:291 | 404 | rewrite: starts lowercase; no final full stop | 'no such derived fact' |
| routes_learned.py:308 | 404 | rewrite: starts lowercase; no final full stop | 'no such derived fact' |
| routes_models.py:407 | 502 | computed | '<computed> str(exc)' |
| routes_models.py:577 | 409 | rewrite: no final full stop | "{} isn't running" |
| routes_models.py:582 | 400 | rewrite: no final full stop | "'{}' isn't available on {}" |
| routes_models.py:600 | 400 | rewrite: no final full stop | "'{}' isn't available on {}" |
| routes_models.py:617 | 400 | rewrite: no final full stop | "'{}' isn't available on {}" |
| routes_models.py:638 | 400 | rewrite: no final full stop | "'{}' isn't available on {}" |
| routes_models.py:672 | 400 | rewrite: no final full stop | "'{}' isn't available on {}" |
| routes_models.py:677 | 400 | computed | '<computed> str(exc)' |
| routes_models.py:741 | 400 | computed | '<computed> reason' |
| routes_models.py:788 | 400 | rewrite: no final full stop | "Unknown job kind '{}'" |
| routes_models.py:790 | 404 | rewrite: no final full stop | 'No such job is running' |
| routes_models.py:801 | 400 | rewrite: no final full stop | 'Pick an Ollama embedding model' |
| routes_models.py:804 | 409 | rewrite: no final full stop | 'A re-index is already running' |
| routes_models.py:852 | 409 | rewrite: no final full stop | 'A re-index is already running' |
| routes_models.py:874 | 409 | rewrite: no final full stop | "{} isn't running" |
| routes_models.py:886 | 409 | keep | "'{}' is in use: switch to another model first, then remove it." |
| routes_models.py:891 | 502 | computed | '<computed> str(exc)' |
| routes_models.py:904 | 422 | computed | "<computed> info['error']" |
| routes_models.py:908 | 409 | rewrite: no final full stop | "{} isn't running" |
| routes_models.py:911 | 409 | rewrite: no final full stop | 'Already downloading {}' |
| routes_night.py:95 | 404 | rewrite: no final full stop | 'No such night run' |
| routes_reminders.py:63 | 422 | keep | "That reminder's due time is in the past, pick a time that hasn't happened yet." |
| routes_reminders.py:93 | 404 | rewrite: no final full stop | 'Reminder not found' |
| routes_reminders.py:319 | 404 | rewrite: no final full stop | 'Entry not found' |
| routes_reminders.py:371 | 503 | keep | "The local AI isn't running, and I couldn't read a time from that. Try “in 20 minutes”, or use the form." |
| routes_resurface.py:110 | 422 | rewrite: starts lowercase; no final full stop; underscore identifier | 'as_of must be YYYY-MM-DD' |
| routes_settings.py:1023 | 422 | rewrite: no final full stop | '“{}”: {}' |
| routes_settings.py:1028 | 422 | rewrite: no final full stop | '“{}” is a built-in skill, pick another name' |
| routes_settings.py:1053 | 422 | rewrite: no final full stop | '“{}” is already used by another template' |
| routes_settings.py:1073 | 422 | keep | 'Use a full path, not a relative one.' |
| routes_settings.py:1075 | 422 | keep | "{} isn't a folder that exists." |
| routes_settings.py:1077 | 422 | keep | "{} isn't writable." |
| routes_settings.py:1219 | 422 | keep | "A preference can't be empty." |
| routes_settings.py:1227 | 409 | keep | 'That one is already saved.' |
| routes_settings.py:1232 | 409 | keep | 'There are already {} saved preferences, which is the limit. Turn one off before adding another.' |
| routes_settings.py:1268 | 404 | rewrite: no final full stop | 'No such preference' |
| routes_settings.py:1284 | 404 | rewrite: no final full stop | 'No such preference' |
| routes_settings.py:1288 | 422 | keep | "A preference can't be empty." |
| routes_settings.py:1301 | 404 | rewrite: no final full stop | 'No such preference' |
| routes_settings.py:1394 | 400 | rewrite: no final full stop | "Undo works on the AI's changes, not yours" |
| routes_settings.py:2308 | 400 | keep | "Choose a folder that exists inside your home folder or the notebook's data folder." |
| routes_settings.py:2326 | 422 | keep | '{} files at once is more than one import handles ({} max): split it into smaller batches.' |
| routes_settings.py:2401 | 503 | computed | '<computed> importer.INSTALL_HINT' |
| routes_settings.py:2405 | 413 | rewrite: no final full stop | 'File is larger than 20 MB' |
| routes_settings.py:2407 | 400 | rewrite: no final full stop | 'The file is empty' |
| routes_settings.py:2420 | 422 | rewrite: no final full stop | "Couldn't read that file: {}" |
| routes_settings.py:2429 | 422 | rewrite: no final full stop | 'That file had no readable text in it' |
| routes_spaces.py:51 | 400 | rewrite: starts lowercase; no final full stop | 'icon must match ^ph-[a-z0-9-]{1,40}$' |
| routes_spaces.py:58 | 400 | rewrite: starts lowercase; no final full stop | 'name must not be empty' |
| routes_spaces.py:60 | 400 | rewrite: starts lowercase; no final full stop | 'name must be at most {} characters' |
| routes_spaces.py:84 | 404 | rewrite: no final full stop | 'Space not found' |
| routes_spaces.py:99 | 400 | keep | 'The default space cannot be hidden from All spaces.' |
| routes_spaces.py:175 | 400 | rewrite: no final full stop | 'Cannot delete default spaces' |
| routes_spaces.py:176 | 404 | rewrite: no final full stop | 'Space not found' |
| routes_spaces.py:179 | 400 | rewrite: no final full stop | 'Pick a different space to move its contents to' |
| routes_spaces.py:180 | 404 | rewrite: no final full stop | 'The space to move to was not found' |
| routes_tags.py:83 | 400 | computed | '<computed> str(exc)' |
| routes_tags.py:92 | 400 | computed | '<computed> str(exc)' |
| routes_tags.py:100 | 400 | rewrite: no final full stop | 'Say which tag to remove' |
| routes_timeline.py:124 | 422 | rewrite: starts lowercase; no final full stop | 'kind must be one or more of {}' |
| routes_timeline.py:354 | 422 | rewrite: starts lowercase; no final full stop | 'scale must be one of {}' |
| routes_timeline.py:358 | 422 | rewrite: starts lowercase; no final full stop | 'group must be category, tag, thread or none' |
| routes_timeline.py:362 | 422 | rewrite: starts lowercase; no final full stop | 'limit must be between 1 and {}' |
| routes_timeline.py:385 | 422 | rewrite: no final full stop | 'Invalid date format for start/end' |
| routes_timeline.py:415 | 422 | rewrite: no final full stop | 'Invalid cursor' |
| routes_update.py:614 | 400 | keep | 'Not a valid release tag.' |
| routes_update.py:620 | 403 | keep | "Turn on 'Check GitHub for a newer version' in Settings → About first: this needs to know a release actually exists." |
| routes_update.py:626 | 403 | keep | "Automatic updates are turned off in Settings → About, turn on 'Update automatically' first, or download the installer from the release page instead." |
| routes_update.py:633 | 409 | keep | 'Automatic updates are only available for the packaged Windows app right now, download the new version from the release page instead.' |
| routes_update.py:639 | 409 | keep | 'An update is already being applied.' |
| routes_update.py:663 | 502 | keep | "Couldn't reach GitHub to fetch the update, check your internet connection and try again." |
| routes_update.py:669 | 404 | keep | 'No release found for that tag.' |
| routes_update.py:677 | 502 | keep | 'That release has no Windows installer attached.' |
| routes_voice.py:44 | 503 | computed | '<computed> voice.INSTALL_HINT' |
| routes_voice.py:48 | 413 | computed | '<computed> over_limit_detail' |
| routes_voice.py:50 | 400 | rewrite: no final full stop | 'The recording is empty' |
| routes_voice.py:71 | 503 | computed | '<computed> str(exc)' |
| routes_voice.py:74 | 422 | rewrite: no final full stop | "Couldn't transcribe that recording: {}" |
| routes_voice.py:87 | 413 | rewrite: no final full stop | 'Recording is larger than 25 MB' |
| routes_voice.py:100 | 413 | rewrite: no final full stop | 'Recording is larger than 300 MB' |
| routes_webclip.py:43 | 403 | computed | '<computed> WEB_OFF' |
| routes_webclip.py:47 | ? | computed | '<computed> str(exc)' |
| routes_websearch.py:30 | 403 | keep | 'Web search is turned off. Enable it in Settings → Web search (one of the two features that can go online, with the update check).' |
| routes_websearch.py:76 | 502 | computed | '<computed> str(exc)' |
| routes_websearch.py:158 | 503 | computed | '<computed> str(exc)' |
| routes_websearch.py:189 | 409 | computed | '<computed> str(exc)' |
| routes_websearch.py:207 | 503 | computed | '<computed> str(exc)' |
| routes_websearch.py:237 | 400 | rewrite: no final full stop | 'Only http(s) URLs are allowed' |
| routes_websearch.py:242 | 502 | computed | '<computed> str(exc)' |
| routes_whiteboard.py:497 | 422 | rewrite: no final full stop | 'An image object needs a /media/... url' |
| routes_whiteboard.py:501 | 422 | rewrite: no final full stop | 'A {} object needs content' |
| routes_whiteboard.py:510 | 422 | rewrite: no final full stop; underscore identifier | 'A {} node needs a ref_id, the id of the {} it stands for' |
| routes_whiteboard.py:595 | 404 | rewrite: no final full stop | 'No note with id {}' |
| routes_whiteboard.py:620 | 404 | rewrite: no final full stop | 'No board with id {}' |
| routes_whiteboard.py:1629 | 422 | rewrite: no final full stop | 'Unknown board type {}: expected ' |
| routes_whiteboard.py:1888 | 404 | rewrite: no final full stop | 'Board not found' |
| routes_whiteboard.py:2014 | 404 | rewrite: no final full stop | 'No board with id {}' |
| routes_whiteboard.py:2123 | 404 | rewrite: no final full stop | 'Node not found' |
| routes_whiteboard.py:2153 | 404 | rewrite: no final full stop | 'Node not found' |
| routes_whiteboard.py:2195 | 404 | rewrite: no final full stop | 'Sketch not found' |
| routes_whiteboard.py:2218 | 404 | rewrite: no final full stop | 'Sketch not found' |
| routes_whiteboard.py:2293 | 404 | rewrite: no final full stop | 'Object not found' |
| routes_whiteboard.py:2301 | 422 | rewrite: no final full stop | "An object's kind can't change" |
| routes_whiteboard.py:2338 | 404 | rewrite: no final full stop | 'Object not found' |
| routes_whiteboard.py:2476 | 422 | rewrite: no final full stop | 'Unknown map node kind {}: expected ' |
| routes_whiteboard.py:2501 | 422 | rewrite: no final full stop; underscore identifier | 'A {} node needs a ref_id' |
| routes_whiteboard.py:2511 | 404 | rewrite: no final full stop | 'No {} with id {}' |
| routes_whiteboard.py:2799 | 404 | rewrite: no final full stop | 'No board with id {}' |
| routes_whiteboard.py:2897 | 404 | rewrite: no final full stop | 'No node with id {} on this board' |
| routes_whiteboard.py:2987 | 404 | rewrite: no final full stop | 'No node with id {} on this board' |
| routes_whiteboard.py:2997 | 422 | keep | "A node can't be its own parent, that makes it a descendant of itself." |
| routes_whiteboard.py:3003 | 404 | rewrite: no final full stop | 'No node with id {} on this board' |
| routes_whiteboard.py:3008 | 422 | keep | 'That would make the node a descendant of itself, move the branch out first.' |
| routes_whiteboard.py:3113 | 422 | keep | 'Node {} is in this batch twice; each node moves once.' |
| routes_whiteboard.py:3129 | 404 | rewrite: no final full stop | 'No node with id {} on this board' |
| routes_whiteboard.py:3141 | 422 | keep | "A node can't be its own parent, that makes it a descendant of itself." |
| routes_whiteboard.py:3146 | 404 | rewrite: no final full stop | 'No node with id {} on this board' |
| routes_whiteboard.py:3156 | 422 | keep | 'That would make node {} a descendant of itself, move the branch out first.' |
| routes_whiteboard.py:3684 | 422 | rewrite: no final full stop | 'Unknown export format {}: expected one of ' |
| routes_whiteboard.py:3788 | 503 | rewrite: no final full stop | '{} import needs the defusedxml package: pip install defusedxml' |
| routes_whiteboard.py:3795 | 422 | rewrite: exclamation mark | 'That {} declares a document type. Remove the <!DOCTYPE ...> line and try again.' |
| routes_whiteboard.py:3801 | 422 | rewrite: no final full stop | "That isn't valid {}: {}" |
| routes_whiteboard.py:3928 | 422 | keep | 'That outline has more than {} nodes: split it up first.' |
| routes_whiteboard.py:3990 | 422 | keep | 'That outline has more than {} nodes: split it up first.' |
| routes_whiteboard.py:4039 | 422 | keep | 'That outline has more than {} nodes: split it up first.' |
| routes_whiteboard.py:4299 | 404 | keep | 'None of those notes can be mapped (deleted, private, or already a board).' |
| routes_whiteboard.py:4427 | 422 | keep | "That outline has no nodes in it: each line starts with '- '." |
| run_sandbox.py:374 | 400 | keep | 'Bad host.' |
| run_sandbox.py:417 | 404 | keep | 'Not installed.' |

## After

The table above is the tree at 8373c7e. After the five rewrite commits the
same collector finds 302 literals and 0 to rewrite, and
`tests/test_server_detail_wording.py` holds that line. A few "keep" rows were
also tidied by hand because the rules cannot see them (comma splices that
should be two sentences, the Word exporter's package name, the update
route's hints).

## Not touched: computed at run time

These detail strings are built elsewhere (`str(exc)` of a core error, a
constant in `core/` or `ai/`), so they are outside `src/memorymap/api/` and
outside what an `ast` check of literals can see. Worth a separate pass:
`core/ocr.py` `unavailable_reason`, `core/docview.py` `editability`,
`ai/voice.py` and `entry/importer.py` `INSTALL_HINT` (a bare `pip install`
line), `core/model_cards.py` `inspect_model_name` errors,
`core/security.py` `check_backend_url` reasons, and every `str(exc)` row
above (they pass a Python exception message through).
