# search-boot-1005 (resume pass)

Done:
- Search surfaces onto `GET /search`: all three built before the restart (Notes 91a6da1, Library 27883ca, palette 4cbd8f2); OPEN.md row closed, account in HISTORY.md.
- Boot gzip: 700,825 -> 692,894 bytes (40 scripts). Caps lowered: BOOT_JS_CAP 693,000, TOTAL_CAP 323,500, APP_JS_CAP 15,300, GUARDS_CAP 368.
- `scratchpad/ui-sweeps/search1005-lazy.js` and `search1005-boot.js`: PASS at 1440, 390, dark.

Left:
- The note edit form (about 350 lines in notes-list.js) stays put until the edit-form redesign lands; moving it to a lazy file was the biggest remaining boot candidate (about 2 KB gzipped).
- `claude/notes-flow-rebuild` not merged into this branch (the merge command was refused by the permission classifier); it has moved on in notes-list.js, note-edit-panels.js, app-palette.js, library.js. Expect small conflicts in app-palette.js and library.js, where this branch appends moved blocks at the end of the file.
- Other boot candidates need a second owner file (`noteFieldPickButton`: documents.js and note-properties.js) or are used at boot (avatars.js, 92 KB gzipped, paints faces at boot).
