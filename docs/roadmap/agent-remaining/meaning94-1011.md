# meaning94-1011 (Brief 94, INBOX 850, 857)

Status: (a) find by meaning built; (b) autocorrect outside the editor open.

## Left
- (b) Autocorrect outside the editor (INBOX 850, "is there an autocorrect feature with the ability to undo it?? everwhere on the app??"): notes, the chat and Ask composers and titles; one Settings switch (on for prose fields, never code, URLs, tags or search boxes); 5 s underline with one-click revert; Ctrl+Z and Backspace undo; toast with Undo. Today: `docAutocorrectAt` (document editor only).
- Library boxes (Library filter, graph filter) are not on the meaning layer: they search notes through `/read/filter` and the search engine, whose meaning half is the embedding search.
- Brief 86's suggest code (status.js) should call `meaningAlts` for its candidates once it lands beside this.

## Not verified
- Close in meaning against a real embedding model: no torch in the sandbox; the route is tested with a letter-count embedder and the page with /read/near faked in Chromium.

## Found, not fixed
- Help's topics keep their document order when searching, so the best match by name can sit below others in the same filter (help top-3 38/60 against settings 58/60).
