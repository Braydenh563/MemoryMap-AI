// note-edit-form.js: the form a note turns into when it is edited in the list
// (`renderEditForm`), and the formatting strip it clones from the capture box
// (`noteEditToolbar`, `NOTE_EDIT_TOOLBAR`). Moved out of notes-list.js on
// 2026-10-05 (search-boot-1005, the boot-script gzip budget in
// tests/test_static_compression.py and tests/test_boot_budget.py): nothing is
// edited until a person presses Edit, so none of it is needed to draw the list.
//
// **How a synchronous caller stays safe.** `entryItem` (note-cards.js) calls
// `renderEditForm(li, entry)` while building the list, and reads the card it
// filled, so it cannot be a promise-returning stand-in. The one way a row is
// ever asked to render as a form is `editingId = id` in `openNoteEditor`
// (notes-list.js, the only assignment), which awaits
// `ensureModule("noteEditForm")` first and refuses, with a toast, when the file
// cannot be fetched: so by the time any row asks for a form, this file is in,
// and no render ever reaches `renderEditForm` without it.
//
// What stayed in notes-list.js: `noteFormDirty`, `noteFormDraft`,
// `noteFormMayClose`, `closeNoteForm` and `openNoteEditor`, which other files
// read with the form closed.

//: **The formatting row the note edit form never had.**
//:
//: Editing an existing note is the most common editing action in a notebook,
//: and it was the app's poorest surface by a distance: a bare three-row
//: textarea with no toolbar, no "/" menu and no selection bar, while the
//: composer beside it and the document editor both had all three. That is
//: most of what *"the editors feel very fake and just rudimentary"* is about.
//:
//: The same `data-md` contract the other two toolbars use, wired here rather
//: than through `initMarkdownToolbars` (documents.js) because that runs once
//: over the markup at load and this row is built each time a note is opened.
//: The same set the document editor's strip carries (minus colours), in
//: the same groups: asked for: "the ui and features when editing a note
//: need to be updated with the new upgraded formatting toolbar". `null`
//: entries are group separators.
const NOTE_EDIT_TOOLBAR = [
  { md: "h1", label: "ph:text-h-one", title: "Heading 1 (Ctrl+1)" },
  { md: "h2", label: "ph:text-h-two", title: "Heading 2 (Ctrl+2)" },
  { md: "h3", label: "ph:text-h-three", title: "Heading 3 (Ctrl+3)" },
  null,
  { md: "bold", label: "ph:text-b", title: "Bold (Ctrl+B)" },
  { md: "italic", label: "ph:text-italic", title: "Italic (Ctrl+I)" },
  { md: "strike", label: "ph:text-strikethrough", title: "Strikethrough" },
  { md: "highlight", label: "ph:highlighter", title: "Highlight" },
  { md: "code", label: "ph:code", title: "Inline code (Ctrl+E)" },
  { md: "clearformat", label: "ph:eraser", title: "Clear highlight and colour" },
  null,
  { md: "ul", label: "ph:list-bullets", title: "Bulleted list" },
  { md: "ol", label: "ph:list-numbers", title: "Numbered list" },
  { md: "task", label: "ph:check-square", title: "Task list" },
  { md: "quote", label: "ph:quotes", title: "Quote" },
  null,
  { md: "link", label: "ph:link", title: "Link" },
  { md: "table", label: "ph:table", title: "Table (Tab moves between cells)" },
  { md: "codeblock", label: "ph:brackets-curly", title: "Code block" },
  { md: "hr", label: "ph:minus", title: "Divider" },
];

function noteEditToolbar(boxId) {
  //: **The same strip as the capture box, cloned**, reported: "the toolbar
  //: isn't the same as the note capture and documents". The capture strip
  //: (`#note-toolbar`) is the source of truth; a clone drops the extras the
  //: mount appended (their listeners do not survive cloning) and is wired
  //: fresh by `wireMarkdownToolbar`, which mounts them again. The hand-built
  //: list below is only the fallback for a page without that strip.
  const source = document.getElementById("note-toolbar");
  if (source && typeof wireMarkdownToolbar === "function") {
    const clone = source.cloneNode(true);
    clone.removeAttribute("id");
    //: `note-toolbar` is kept on the clone: it is what makes this the
    //: *composer's* strip rather than the full-page editor's, and dropping it
    //: gave a form inside a note card the document editor's own chrome padding
    //: (measured 91px against the composer's 88 at the same width, both above
    //: a small box). Reported with the capture strip beside it.
    clone.className = "doc-toolbar note-toolbar note-edit-toolbar";
    clone.setAttribute("aria-label", "Formatting");
    for (const extra of clone.querySelectorAll("[data-md-extra]")) extra.remove();
    //: **The Source button stays in the strip**, marked because the id is
    //: stripped two lines down and renderEditForm wires it (INBOX 430: it was
    //: Preview, a pane the box already is).
    clone.querySelector("#entry-preview-toggle")?.setAttribute("data-note-preview", "1");
    //: **Every id goes.** A clone carries the capture strip's ids, and two
    //: elements with one id means `document.getElementById` hands back the
    //: *capture* toolbar's control: so the edit form's dropdowns opened and
    //: then applied their formatting to the capture box instead of the note
    //: being edited (reported: "none of the toolbar dropdowns work"). Nothing
    //: in `wireMarkdownToolbar` needs an id; it walks elements.
    for (const el of clone.querySelectorAll("[id]")) el.removeAttribute("id");
    delete clone.dataset.mdExtras;
    clone.dataset.mdTarget = boxId;
    //: The wrap/collapse group is appended by `mountDocToolbarControls`, so a
    //: clone carries a *dead* copy of it -- two arrow buttons whose listeners
    //: did not survive cloning -- and, because it was cloned in place rather
    //: than appended, it sat mid-strip where the capture bar's sits last.
    //: Dropped and re-mounted, which is the same trick `data-md-extra` plays
    //: for the dropdown menus.
    clone.querySelector(".doc-toolbar-tools")?.remove();
    wireMarkdownToolbar(clone);
    if (typeof mountDocToolbarControlsFor === "function") mountDocToolbarControlsFor(clone);
    return clone;
  }
  const bar = document.createElement("div");
  bar.className = "doc-toolbar note-toolbar note-edit-toolbar";
  bar.setAttribute("role", "toolbar");
  bar.setAttribute("aria-label", "Formatting");
  for (const action of NOTE_EDIT_TOOLBAR) {
    if (!action) {
      const sep = document.createElement("span");
      sep.className = "doc-toolbar-sep";
      sep.setAttribute("aria-hidden", "true");
      bar.appendChild(sep);
      continue;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.md = action.md;
    button.title = action.title;
    button.setAttribute("aria-label", action.title);
    setLabel(button, action.label);
    //: mousedown-preventDefault keeps the caret in the textarea, the same
    //: rule `initMarkdownToolbars` and the selection bar both follow, and for
    //: the same reason: a click moves focus first and the selection is gone.
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", () => applyMarkdown(action.md, boxId));
    bar.appendChild(button);
  }
  return bar;
}

function renderEditForm(li, entry) {
  const draft = noteFormDraft && noteFormDraft.id === entry.id ? noteFormDraft : null;
  noteFormDirty = Boolean(draft);
  //: **A title field, as Capture has** (INBOX 432: renaming a note meant
  //: finding and editing its "# " line by hand). Not a stored field: the
  //: leading heading is split off into it and put back on save, the shape
  //: `withTitle` writes in Capture, so the two cannot disagree.
  const heading = /^#[ \t]+([^\n]+)\n*/.exec(entry.content || "");
  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.maxLength = 200;
  titleInput.className = "note-edit-title";
  titleInput.placeholder = "Title";
  titleInput.setAttribute("aria-label", "Title: becomes the note's leading heading");
  titleInput.value = draft ? draft.title : heading ? heading[1].trim() : "";
  titleInput.addEventListener("input", () => { noteFormDirty = true; });
  const textarea = document.createElement("textarea");
  textarea.rows = 3;
  textarea.setAttribute("aria-label", "Note text"); // its editor takes this name (noteSurfaceName)
  textarea.value = draft ? draft.content : heading ? entry.content.slice(heading[0].length) : entry.content;
  textarea.addEventListener("input", () => { noteFormDirty = true; });
  //: A stable id, because three separate features key off one: the "/" menu
  //: and the `[[` autocomplete (EDITOR_SURFACES in editor.js), the selection
  //: bar, and this form's own toolbar. Safe to be a constant rather than a
  //: per-note id: `editingId` allows exactly one open edit form at a time.
  textarea.id = "entry-edit-content";
  textarea.className = "note-edit-box";
  //: Ctrl+B/Ctrl+I/Ctrl+Shift+S, same as the capture box (documents.js:
  //: `wireMdFormatShortcuts`). Passed the element itself, not its id: this
  //: textarea is not in the document yet, and a fresh one exists every
  //: time a note is opened for editing, so this runs on every open rather
  //: than once at boot.
  if (typeof wireMdFormatShortcuts === "function") wireMdFormatShortcuts(textarea);
  //: Three rows is a form field; a note is prose. Grows with its content the
  //: way the composer does, up to the same shared ceiling.
  textarea.addEventListener("input", () => autoGrow(textarea));
  //: `requestAnimationFrame`, not `queueMicrotask`: a microtask runs before
  //: the browser has laid anything out, and `autoGrow` reads `scrollHeight`,
  //: which is 0 on an element that is not yet in the document, measured, the
  //: box stayed at its three-row height with the note scrolling inside it.
  //: Also on focus, because a note opened while its list was hidden (a tab
  //: switch, a filter) is laid out only when it becomes visible.
  textarea.addEventListener("focus", () => autoGrow(textarea));
  requestAnimationFrame(() => autoGrow(textarea));

  const tagsInput = document.createElement("input");
  tagsInput.type = "text";
  tagsInput.placeholder = "Tags, comma separated";
  tagsInput.value = draft ? draft.tags : entry.tags.join(", ");
  tagsInput.className = "note-edit-tags";
  tagsInput.setAttribute("aria-label", "Tags, comma separated");
  tagsInput.autocomplete = "off";
  tagsInput.addEventListener("input", () => { noteFormDirty = true; });
  if (focusTagsAfterRender === entry.id) {
    focusTagsAfterRender = null;
    // The form is not in the document yet; focus once it is.
    requestAnimationFrame(() => tagsInput.focus());
  }
  if (focusBodyAfterRender === entry.id) {
    focusBodyAfterRender = null;
    requestAnimationFrame(() => {
      const surface = typeof noteSurfaceFor === "function" ? noteSurfaceFor(textarea) : null;
      if (surface) surface.focus();
      else textarea.focus();
    });
  }

  const categorySelect = document.createElement("select");
  fillCategoryOptions(categorySelect, entry.category);
  categorySelect.setAttribute("aria-label", "Category");
  if (draft && [...categorySelect.options].some((o) => o.value === draft.category)) {
    categorySelect.value = draft.category;
  }
  categorySelect.addEventListener("change", () => { noteFormDirty = true; });
  const keepDraft = () => {
    noteFormDraft = { id: entry.id, title: titleInput.value, content: textarea.value, tags: tagsInput.value, category: categorySelect.value };
  };
  for (const field of [titleInput, textarea, tagsInput]) field.addEventListener("input", keepDraft);
  categorySelect.addEventListener("change", keepDraft);

  const row = document.createElement("div");
  row.className = "row";
  const saveButton = row.appendChild(
    smallButton(
      "Save changes",
      "Save your corrections",
      async () => {
        const category = await resolveCategoryChoice(categorySelect);
        if (category === undefined) return; // user cancelled the prompt
        //: An emptied box used to save as "Note saved." while quietly
        //: keeping the old text (INBOX 432). Said instead, with the way to
        //: actually remove a note.
        const written = withTitle(textarea.value.trim(), titleInput.value);
        if (!written.trim()) {
          toast("A note needs some text. To remove it, use Move to bin in its menu.", true);
          return;
        }
        const before = { content: entry.content, category: entry.category, tags: entry.tags };
        const after = {
          content: written,
          category,
          tags: tagsInput.value.split(",").map((t) => t.trim()).filter(Boolean),
        };
        //: `base_hash`: the text this form opened on, so a save over a
        //: newer text from another window is refused rather than silently
        //: replacing it (WORLD_CLASS_PLAN 22.1 item 5); the prompt then
        //: decides: "keep mine" saves again from the other window's text,
        //: "take theirs" puts that text in the form to go on from.
        let base = entry.content_hash;
        let saved = null;
        for (;;) {
          try {
            saved = await api(`/entries/${entry.id}`, {
              method: "PUT",
              body: JSON.stringify({ ...after, base_hash: base, ai_assisted: textarea.dataset.aiTouched === "1" }),
            });
            break;
          } catch (error) {
            if (!isEditConflict(error)) throw error;
            const current = error.detail.current;
            const answer = await editConflictPrompt({ noun: "note", mine: after.content, theirs: current.content || "" });
            if (answer === "mine") {
              base = current.content_hash;
              continue;
            }
            if (answer === "theirs") {
              Object.assign(entry, current);
              const theirs = /^#[ \t]+([^\n]+)\n*/.exec(current.content || "");
              titleInput.value = theirs ? theirs[1].trim() : "";
              textarea.value = theirs ? current.content.slice(theirs[0].length) : current.content || "";
              noteFormDirty = false;
            }
            return;
          }
        }
        editingId = null;
        noteFormDirty = false;
        noteFormDraft = null;
        toast("Note saved.");
        offerWikiRename(entry.id, await saved?.json?.().catch(() => null));
        await refreshEntries([entry.id]);
        pushEntryPutUndo(entry.id, "Edited a note", before, after);
      },
      false
    )
  );
  //: Ctrl+Enter saves, as it does in the capture box (INBOX 432): the edit
  //: form had no chord at all, so a note opened from the list could only be
  //: saved with the mouse. The editor view forwards the chord here.
  textarea.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      saveButton.click();
    }
  });
  //: Escape closes the form, asking first when it has changes (INBOX 432:
  //: it did nothing). Bubbling, and only when nothing inside took it first,
  //: so the "/" menu, the [[ list and the editor's own Escape still win.
  li.addEventListener("keydown", async (event) => {
    if (event.key !== "Escape" || event.defaultPrevented || editingId !== entry.id) return;
    if (document.querySelector(".action-menu:not(.hidden), #editor-menu:not(.hidden)")) return;
    event.preventDefault();
    if (await noteFormMayClose()) closeNoteForm();
  });
  row.appendChild(
    smallButton("Cancel", "Discard changes", async () => {
      if (await noteFormMayClose()) closeNoteForm();
    })
  );

  //: One meta row, tags, category, then Save/Cancel at the right, instead
  //: of three stacked full-width rows under the text (reported with a
  //: screenshot: "better ui structure").
  const meta = document.createElement("div");
  meta.className = "note-edit-meta";
  row.classList.add("note-edit-actions");
  meta.append(tagsInput, categorySelect, row);
  const toolbarEl = noteEditToolbar(textarea.id);
  //: Preview: reported: "there is no preview", then, once there was one,
  //: "if the formatting bar was the same, the preview button would be in
  //: it". So there is no second Write / Preview control any more: the
  //: cloned strip's own Preview button is the switch, exactly as in the
  //: capture box and the document editor, and it renders the textarea's
  //: current text with the same renderer every note card uses.
  //: The cloned strip's Source button (wiring.js `setNoteSource`): the same
  //: one choice as Capture's, for every note box. The edit box renders as you
  //: type, so there is no Preview to switch to (INBOX 430).
  const sourceBtn = toolbarEl.querySelector("[data-note-preview]");
  sourceBtn?.addEventListener("click", () => setNoteSource(!noteSourceOn()));
  if (sourceBtn) {
    sourceBtn.setAttribute("aria-pressed", String(noteSourceOn()));
    sourceBtn.classList.toggle("is-active", noteSourceOn());
  }
  //: Attachment cards for the files this note's text points at, the same
  //: cards and the same menu as the capture box (INBOX 440 (2)).
  const chipsHost = document.createElement("div");
  chipsHost.className = "att-cards hidden";
  chipsHost.id = "entry-edit-attachment-chips";
  chipsHost.setAttribute("role", "group");
  chipsHost.setAttribute("aria-label", "Files in this note");
  li.append(titleInput, toolbarEl, textarea, chipsHost, meta);
  // The same line-number gutter the capture box and the documents editor
  // carry (documents.js `mountGutterFor`); it follows the one remembered
  // choice, so a person who turned numbers on in Capture sees them here too.
  //: On the next frame, not now: this <li> is still detached (`entryItem`
  //: returns it to the list renderer), and `applyDocGutter` walks the
  //: document to set the strip button's pressed state: measured, the button
  //: opened with no state and no title until the first click without this.
  //:
  //: **Both are lazy entry points** (`LAZY_ENTRY_POINTS`). `applyDocGutter`
  //: was not, so before the Library bundle had loaded this line threw a
  //: ReferenceError in the middle of `renderEntries` and left the list half
  //: drawn: the owner's "the first time I try editing a note after a restart,
  //: the notes page goes blank". The mount is awaited so the strip exists
  //: when the pressed state is set.
  Promise.resolve(mountGutterFor(textarea)).then(() => requestAnimationFrame(() => applyDocGutter()));
  renderEntryAttachmentChips(textarea, chipsHost);
  textarea.addEventListener("input", () => renderEntryAttachmentChips(textarea, chipsHost));
  renderRelatedWhileEditing(li, entry);
  renderNoteBookmarksWhileEditing(li, entry);
}
