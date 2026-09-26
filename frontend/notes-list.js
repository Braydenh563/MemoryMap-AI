// notes-list.js: a note's panels, the edit form, the notes filter, incremental
// rendering, list keyboard. Moved out of app.js on 2026-09-26 as one contiguous
// range (INBOX 426 cc, docs/roadmap/agent-remaining/appjs-split.md). A classic
// script sharing app.js's globals, loaded in app.js's old order; nothing in an
// earlier file calls into it while the page loads (scratchpad/appjs-map.js
// --check).

async function downloadAttachment(attachment) {
  const response = await api(`/files/${attachment.id}`);
  await saveFile(attachment.filename, await response.blob());
}

//: **One open panel, named by which one it is.** Three menu items open a row
//: under a note card: "Similar notes", "Referenced by" and "Forgotten notes
//: like this". Each kept its own open-id, and two of them said in their own
//: comments that there should only be one, which is what happens when a
//: third arrives: opening one left the others' ids set, so the next click on
//: a *different* panel toggled the stale id instead and did nothing visible.
//:
//: One id and one kind, because the panels genuinely are one thing: they draw
//: the same `.entry-links` row in the same place on the same card, and
//: `renderEntries` clears whichever is showing, so only one can ever be on
//: screen anyway. The variable now says that rather than three variables
//: agreeing by accident.
let notePanel = { id: null, kind: null };

//: Toggle the named panel on a note: returns true when it should now be
//: drawn, false when the click closed it. `renderEntries` between the two is
//: what takes the previous panel off, whichever card it was on.
function toggleNotePanel(entry, kind) {
  const open = notePanel.id === entry.id && notePanel.kind === kind;
  notePanel = open ? { id: null, kind: null } : { id: entry.id, kind };
  renderEntries();
  return !open;
}

//: Is the panel this render is finishing still the one that was asked for? An
//: `await` sits between the click and the append, and in that window the
//: reader can open something else or close this one.
function notePanelStillOpen(entry, kind) {
  return notePanel.id === entry.id && notePanel.kind === kind;
}


async function toggleRelated(entry) {
  if (!toggleNotePanel(entry, "related")) return;
  const related = await apiJson(`/entries/${entry.id}/related`).catch(() => []);
  const card = document.querySelector(`#entry-list li[data-id="${entry.id}"]`);
  if (!card || !notePanelStillOpen(entry, "related")) return;
  const row = document.createElement("div");
  row.className = "entry-links";
  const label = document.createElement("span");
  label.className = "muted";
  label.textContent = related.length ? "Similar:" : "No similar notes found.";
  row.appendChild(label);
  for (const other of related) {
    row.appendChild(similarNoteRow(entry, other, () => {
      // Nothing else on this card changes, so re-rendering the whole list
      // would only cost the open panel its place.
      if (!row.querySelector(".entry-related-row")) {
        label.textContent = "All similar notes are linked.";
      }
    }));
  }
  card.appendChild(row);
}

//: **What points at this note** (INBOX 246, the owner: "I want it to show in
//: notes if they are attached to or referenced in/by a document, note,
//: whiteboard, or mindmap").
//:
//: Deliberately the same shape as `toggleRelated` above, down to the single
//: open-id variable: the two answer neighbouring questions ("what is like
//: this" and "what points at this"), they open in the same place on the same
//: card from the same menu, and a second way of drawing a row under a note
//: would be a second thing to keep consistent for no gain.
//:
//: What each kind of reference is called on the chip, and the icon that says
//: it without being read. A table rather than a chain of ternaries, because
//: the kinds are the four the owner named and a missing one should be
//: obvious rather than silently falling through to "note".
const REFERENCE_KIND_LABELS = {
  document: ["ph:file-text", "document"],
  note: ["ph:note", "note"],
  board: ["ph:squares-four", "board"],
  map: ["ph:tree-structure", "map"],
};

//: **The faded notes nearest this one** (INBOX 261). `GET
//: /resurface/near/{entry_id}` shipped with the rest of resurfacing and no
//: `frontend/*.js` ever named it: found by `scratchpad/probe_dead_routes.py`,
//: the same scan that found WORLD_CLASS_PLAN I9's whole backend built with no
//: screen at all. A ranking nobody can read is a ranking that does not exist.
//:
//: **Not the same question as "Similar notes" above**, which is why it is its
//: own row rather than a filter on that one. `/entries/{id}/related` answers
//: "what means the same as this", newest and busiest notes included;
//: `resurface.for_context` answers "what have you forgotten that bears on
//: this", ranking by age, links and opens first and nearness second. The
//: first is a lookup, the second is the thing this app is for.
//:
//: One open panel at a time across all three: see `notePanel` above, which is
//: the single piece of state the three share.

async function toggleFaded(entry) {
  if (!toggleNotePanel(entry, "faded")) return;
  const answer = await apiJson(`/resurface/near/${entry.id}`, { silent: true }).catch(() => null);
  const card = document.querySelector(`#entry-list li[data-id="${entry.id}"]`);
  if (!card || !notePanelStillOpen(entry, "faded")) return;
  const row = document.createElement("div");
  row.className = "entry-links";
  const label = document.createElement("span");
  label.className = "muted";
  const items = (answer && answer.items) || [];
  //: Three states, not two, exactly as `toggleReferences` has them: "nothing
  //: is faded near this" and "we could not ask" are different facts, and the
  //: second has a third cause of its own here (a notebook under
  //: `resurface.MIN_NOTEBOOK` is refused a ranking by design, so an empty
  //: answer on a small notebook is not a finding about this note).
  label.textContent = !answer
    ? "Couldn't look for forgotten notes near this one."
    : items.length
      ? "Forgotten, and close to this:"
      : "Nothing faded is close to this note.";
  row.appendChild(label);
  for (const item of items) {
    const wrap = document.createElement("span");
    wrap.className = "entry-related-row";
    const fadedChip = chip("", "link", () => flashEntry(item.id));
    setLabel(fadedChip, `ph:hourglass-medium ${item.title}`);
    //: The card's own sentence, which the route sends precisely so a panel
    //: can say why it chose something: "120 days old, no links, never
    //: opened" is checkable and "0.82" is not.
    fadedChip.title = item.reason || item.preview || "";
    wrap.appendChild(fadedChip);
    const why = document.createElement("span");
    why.className = "muted entry-reference-how";
    why.textContent = item.reason || "";
    wrap.appendChild(why);
    row.appendChild(wrap);
  }
  card.appendChild(row);
}

//: **This note's reminders, under the card** (INBOX 309). The other half of
//: the chip above.
//:
//: The same shape as `toggleReferences` and `toggleFaded` below, down to the
//: shared `notePanel` state, because it answers a neighbouring question about
//: the same note in the same place: a second way of drawing a row under a
//: note is a second thing to keep consistent for no gain.
//:
//: Live reminders only, which is what the chip counted. A reminder ticked off
//: last month is not something this note still wants from you, and the
//: Reminders tab is where a finished one is still readable.
async function toggleNoteReminders(entry) {
  if (!toggleNotePanel(entry, "reminders")) return;
  const answer = await apiJson(
    `/reminders?entry_id=${entry.id}&include_done=false&limit=20`,
    { silent: true }
  ).catch(() => null);
  const card = document.querySelector(`#entry-list li[data-id="${entry.id}"]`);
  if (!card || !notePanelStillOpen(entry, "reminders")) return;
  const row = document.createElement("div");
  row.className = "entry-links";
  const label = document.createElement("span");
  label.className = "muted";
  const items = Array.isArray(answer) ? answer : [];
  //: Three states, not two, the rule the two panels beside this one already
  //: follow: "nothing is due from this note" and "we could not ask" are
  //: different facts.
  label.textContent = !answer
    ? "Couldn't read this note's reminders."
    : items.length
      ? "Reminds you to:"
      : "Nothing is due from this note.";
  row.appendChild(label);
  for (const item of items) {
    const wrap = document.createElement("span");
    wrap.className = "entry-related-row";
    const due = relativeWhen(item.due_at);
    //: `flashReminder` rather than a jump of this panel's own: a
    //: reminder has one home, it loads the tab's list, clears the filter
    //: that would hide it and highlights the row. A second way in here
    //: would be a fifth place a reminder can be read.
    const alarm = chip("", "link", () => flashReminder(item.id));
    setLabel(alarm, `ph:alarm ${item.text}`);
    alarm.title = `Due ${due}. Press to open it in Reminders`;
    wrap.appendChild(alarm);
    const when = document.createElement("span");
    when.className = "muted entry-reference-how";
    when.textContent = due;
    wrap.appendChild(when);
    row.appendChild(wrap);
  }
  card.appendChild(row);
}

async function toggleReferences(entry) {
  if (!toggleNotePanel(entry, "references")) return;
  const answer = await apiJson(`/entries/${entry.id}/references`).catch(() => null);
  const card = document.querySelector(`#entry-list li[data-id="${entry.id}"]`);
  if (!card || !notePanelStillOpen(entry, "references")) return;
  const row = document.createElement("div");
  row.className = "entry-links";
  const label = document.createElement("span");
  label.className = "muted";
  const items = (answer && answer.items) || [];
  //: Three states, not two: "nothing points at this" and "we could not ask"
  //: are different facts and a person acting on the first one deserves to
  //: know it was really the second.
  label.textContent = !answer
    ? "Couldn't check what points at this note."
    : items.length
      ? "Referenced by:"
      : "Nothing points at this note yet.";
  row.appendChild(label);
  for (const item of items) {
    const [icon, word] = REFERENCE_KIND_LABELS[item.kind] || ["ph:note", item.kind];
    const wrap = document.createElement("span");
    wrap.className = "entry-related-row";
    const refChip = chip("", "link", () => {
      //: A board and a map open in the Library, a note in Notes, a document
      //: in its editor. Each already has one way in; this is not a fifth.
      //: Each kind already has exactly one way in, and this uses it rather
      //: than becoming a fifth. `typeof` because the board and document
      //: files are lazy-loaded with the Library bundle and a note card can
      //: be on screen before either has landed.
      if (item.kind === "board" || item.kind === "map") {
        if (typeof openWhiteboardBoard === "function") openWhiteboardBoard(item.id);
      } else if (item.kind === "document") {
        openDocumentFromNote(item.id);
      } else {
        flashEntry(item.id);
      }
    });
    setLabel(refChip, `${icon} ${item.label}`);
    //: Read out loud rather than assembled: "This board on it" is what
    //: pasting the server's phrase after the kind gives you, and it is not a
    //: sentence. The phrase beside the chip stays terse because it sits in a
    //: row of them; the tooltip is where there is room to say it properly.
    refChip.title = {
      "on it": `This ${word} has this note on it`,
      "links to it": `This ${word} links to this note`,
      "mentions it": `This ${word} mentions this note by name`,
    }[item.how] || `This ${word} ${item.how}`;
    wrap.appendChild(refChip);
    //: The relationship, beside the thing rather than inside its name: "on
    //: it", "links to it" and "mentions it" are three different strengths of
    //: claim and the middle one is the only one somebody chose.
    const how = document.createElement("span");
    how.className = "muted entry-reference-how";
    how.textContent = item.how;
    wrap.appendChild(how);
    row.appendChild(wrap);
  }
  card.appendChild(row);
}

// One similar note, with the button that turns it into a real link.
//
// Shared by both places this app shows "≈ Similar", the panel that stays
// open while a note is being edited, and the "≈ Similar notes" menu item on
// a note card. They were already two near-identical loops; adding an action
// to only one of them is exactly how the two would have drifted, and the
// ask named the card one specifically ("like in the similar notes shown in
// the notes tab").
//
// A button, not something either view does on its own: `≈` is a resemblance
// the embedding noticed, while a link is a claim the user makes. The reason
// is deduced server-side for a pair this similar (create_link's
// AUTO_REASON_THRESHOLD) and stays editable wherever links are shown, so
// nothing is asked for at this point.
function similarNoteRow(entry, other, onLinked) {
  const preview = other.content.length > 50 ? other.content.slice(0, 49) + "…" : other.content;
  const wrap = document.createElement("span");
  wrap.className = "entry-related-row";
  const relChip = chip("", "link", () => flashEntry(other.id));
  //: The same mark the menu item that opens this row wears, drawn the same
  //: way: an `<i class="ph">` rather than the character U+2248, which came
  //: out in the page font at the text's own weight beside Phosphor icons in
  //: every neighbouring chip (INBOX 263).
  const relMark = document.createElement("i");
  relMark.className = "ph ph-approximate-equals ph-lead";
  relMark.setAttribute("aria-hidden", "true");
  relChip.appendChild(relMark);
  const previewSpan = document.createElement("span");
  renderInlineMarkdown(previewSpan, preview, [], true);
  relChip.appendChild(previewSpan);
  wrap.appendChild(relChip);

  const linkBtn = smallButton("ph:link Link", `Link this note to “${preview}”`, async () => {
    linkBtn.disabled = true;
    try {
      await apiJson(`/entries/${entry.id}/links`, {
        method: "POST",
        body: JSON.stringify({ target_id: other.id }),
      });
      toast("Linked.");
      wrap.remove();
      onLinked?.();
    } catch (error) {
      linkBtn.disabled = false;
      toast(error.message || "Couldn't link those notes.", true);
    }
  });
  linkBtn.classList.add("entry-related-link-btn");
  wrap.appendChild(linkBtn);
  return wrap;
}

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
    //: **The Preview button stays in the strip.** It used to be cut out of
    //: the clone because the edit form carried a separate Write / Preview
    //: pill of its own -- which is precisely what the report was about:
    //: "if the formatting bar was the same, the preview button would be in
    //: it". Counted in the browser, the clone came out at 60 controls
    //: against the capture strip's 61, and Preview was the one missing. It
    //: is marked here because the id is stripped two lines down, and
    //: renderEditForm needs to find it again to wire it to *this* note's
    //: preview pane.
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
  const textarea = document.createElement("textarea");
  textarea.rows = 3;
  textarea.value = entry.content;
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
  tagsInput.value = entry.tags.join(", ");
  tagsInput.className = "note-edit-tags";
  if (focusTagsAfterRender === entry.id) {
    focusTagsAfterRender = null;
    // The form is not in the document yet; focus once it is.
    requestAnimationFrame(() => tagsInput.focus());
  }

  const categorySelect = document.createElement("select");
  fillCategoryOptions(categorySelect, entry.category);

  const row = document.createElement("div");
  row.className = "row";
  row.appendChild(
    smallButton(
      "Save changes",
      "Save your corrections",
      async () => {
        const category = await resolveCategoryChoice(categorySelect);
        if (category === undefined) return; // user cancelled the prompt
        const before = { content: entry.content, category: entry.category, tags: entry.tags };
        const after = {
          content: textarea.value.trim() || entry.content,
          category,
          tags: tagsInput.value.split(",").map((t) => t.trim()).filter(Boolean),
        };
        await api(`/entries/${entry.id}`, { method: "PUT", body: JSON.stringify(after) });
        editingId = null;
        toast("Entry updated.");
        await loadEntries();
        pushEntryPutUndo(entry.id, "Edited a note", before, after);
      },
      false
    )
  );
  row.appendChild(
    smallButton("Cancel", "Discard changes", () => {
      editingId = null;
      renderEntries();
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
  const previewBtn = toolbarEl.querySelector("[data-note-preview]");
  const preview = document.createElement("div");
  preview.className = "markdown-body note-edit-preview hidden";
  const setView = (mode) => {
    const showPreview = mode === "preview";
    if (showPreview) renderMarkdown(preview, textarea.value);
    preview.classList.toggle("hidden", !showPreview);
    textarea.classList.toggle("hidden", showPreview);
    if (previewBtn) {
      //: `is-active` is what the stylesheet paints a pressed toolbar toggle
      //: with (`.doc-toolbar-toggle.is-active`, 01-forms-settings.css) and what
      //: the capture strip's own button carries; `active` was a second name for
      //: the same state that nothing draws, so this button looked unpressed in
      //: preview while the capture one looked pressed. Both are written, since
      //: the clone can arrive carrying either.
      previewBtn.classList.toggle("is-active", showPreview);
      previewBtn.classList.toggle("active", showPreview);
      previewBtn.setAttribute("aria-pressed", String(showPreview));
    }
    if (!showPreview) textarea.focus();
  };
  previewBtn?.addEventListener("click", () => setView(previewBtn.getAttribute("aria-pressed") === "true" ? "write" : "preview"));
  //: **The clone carries the capture strip's state, including this button's.**
  //: This toolbar is a `cloneNode(true)` of `#note-toolbar` (see
  //: `noteEditToolbar`), so a form opened while the capture box is in preview
  //: arrives with Preview already pressed while showing the textarea, and the
  //: first click on it then reads as doing nothing. Measured while
  //: reproducing INBOX 119 on :8895: `aria-pressed="true"` on a form whose
  //: box was visible. The state is reset rather than `setView("write")` called:
  //: that would focus the textarea, and opening a note for editing does not
  //: otherwise move the caret into it.
  if (previewBtn?.getAttribute("aria-pressed") === "true") {
    previewBtn.classList.remove("is-active", "active");
    previewBtn.setAttribute("aria-pressed", "false");
  }
  //: Attachment cards for whatever this note already carries: rename its
  //: caption, generate one, or remove it, and removing takes the markdown
  //: with it, in the edit form exactly as in the capture box.
  const chipsHost = document.createElement("div");
  chipsHost.className = "row attachment-chips hidden";
  chipsHost.id = "entry-edit-attachment-chips";
  li.append(toolbarEl, textarea, preview, chipsHost, meta);
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

// **A related-notes panel, live while a note is open for editing**, asked
// for as a competitor gap (Mem.ai's own "AI Thought Partner" pitch keeps a
// similar-notes rail visible continuously while writing, not behind a
// click). This app already had the same signal one click away
// (`toggleRelated`'s "≈ Similar notes" menu item, same `/entries/{id}/related`
// endpoint): the gap was that it stayed hidden until asked for, so it read
// as a lookup rather than a thing the app was already thinking about. Shown
// automatically the moment the edit form opens, not gated behind a second
// interaction; a note with nothing similar says so rather than leaving a
// blank space that looks broken.
async function renderRelatedWhileEditing(li, entry) {
  const panel = document.createElement("div");
  panel.className = "entry-related-live muted text-sm";
  panel.textContent = "Finding related notes…";
  li.appendChild(panel);
  let related;
  try {
    related = await apiJson(`/entries/${entry.id}/related`);
  } catch {
    panel.remove(); // a failed lookup says nothing rather than "no notes found"
    return;
  }
  // The form may have closed (Save/Cancel) or moved on to a different note
  // while this was in flight.
  if (editingId !== entry.id || !panel.isConnected) return;
  panel.replaceChildren();
  if (!related.length) {
    panel.textContent = "No related notes yet.";
    return;
  }
  const label = document.createElement("span");
  label.textContent = "Related: ";
  panel.appendChild(label);
  for (const other of related) {
    panel.appendChild(similarNoteRow(entry, other, () => {
      if (!panel.querySelector(".entry-related-row")) {
        panel.textContent = "All related notes are linked.";
      }
    }));
  }
}

// **A note's References** (§30, directly requested: "attach a bookmark to
// a note... show up in References"): the saved-links half of what a note
// can point at, alongside `entry.links`' [[wiki links]] to other notes.
// Its own small panel and its own endpoint (`/entries/{id}/bookmarks`),
// not folded into `entry.links`, a Bookmark isn't an Entry (see the
// Bookmark model's own docstring), so this is a second, parallel kind of
// reference rather than a variant of the first.
async function renderNoteBookmarksWhileEditing(li, entry) {
  const panel = document.createElement("div");
  panel.className = "entry-related-live muted text-sm";
  li.appendChild(panel);

  const attachButton = document.createElement("button");
  attachButton.type = "button";
  attachButton.className = "ghost small";
  setLabel(attachButton, "ph:link Attach a link");
  attachButton.addEventListener("click", () => openBookmarkAttachPicker(entry, panel));

  async function refresh() {
    let attached;
    try {
      attached = await apiJson(`/entries/${entry.id}/bookmarks`);
    } catch {
      return;
    }
    if (editingId !== entry.id || !panel.isConnected) return;
    panel.replaceChildren();
    if (attached.length) {
      const label = document.createElement("span");
      label.textContent = "References: ";
      panel.appendChild(label);
      for (const bookmark of attached) {
        // safeHref(): same scheme guard as library.js's bookmark rows
        // (INBOX 310), so an already-stored bad-scheme bookmark can't reach
        // window.open() from this chip either.
        const bmChip = chip(`ph:link ${bookmark.title || bookmark.url}`, "link", () =>
          window.open(safeHref(bookmark.url), "_blank", "noopener,noreferrer")
        );
        bmChip.title = bookmark.url;
        const detach = document.createElement("span");
        detach.className = "unlink";
        setLabel(detach, "ph:x"); // raw "×" glyph vs Phosphor icon font mismatch mis-centers the icon
        detach.title = "Remove this reference";
        detach.setAttribute("aria-label", `Remove reference to ${bookmark.title || bookmark.url}`);
        detach.addEventListener("click", async (e) => {
          e.stopPropagation();
          await apiJson(`/entries/${entry.id}/bookmarks/${bookmark.id}`, { method: "DELETE" });
          refresh();
        });
        makeUnlinkAccessible(detach);
        bmChip.appendChild(detach);
        panel.appendChild(bmChip);
      }
    }
    panel.appendChild(attachButton);
  }
  await refresh();
}

async function openBookmarkAttachPicker(entry, panel) {
  let all;
  try {
    all = await apiJson("/bookmarks");
  } catch (error) {
    toast(error.message, true);
    return;
  }
  if (!all.length) {
    toast("No saved links yet, add one in Library → Links first.");
    return;
  }
  const select = document.createElement("select");
  select.className = "bookmark-attach-picker";
  const placeholder = document.createElement("option");
  placeholder.textContent = "Pick a saved link…";
  placeholder.value = "";
  select.appendChild(placeholder);
  for (const bookmark of all) {
    const option = document.createElement("option");
    option.value = String(bookmark.id);
    option.textContent = bookmark.title || bookmark.url;
    select.appendChild(option);
  }
  select.addEventListener("change", async () => {
    if (!select.value) return;
    await apiJson(`/entries/${entry.id}/bookmarks`, {
      method: "POST",
      body: JSON.stringify({ bookmark_id: Number(select.value) }),
    });
    select.remove();
    renderNoteBookmarksWhileEditing(panel.parentElement, entry);
  });
  panel.appendChild(select);
  //: `focusSelect`, not `select.focus()`: the native control is out of the tab
  //: order once `enhanceSelect` has replaced it, so the direct call focuses
  //: nothing and this picker opened with the focus on the page body.
  focusSelect(select);
}

// Category <select> shared by capture (guided mode) and the edit form.
function fillCategoryOptions(select, selected) {
  select.replaceChildren();
  const names = [...new Set(allEntries.map((e) => e.category))].sort();
  if (selected === null) {
    const auto = document.createElement("option");
    auto.value = "";
    auto.textContent = "Let Atlas decide";
    select.appendChild(auto);
  }
  for (const name of names) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    if (name === selected) option.selected = true;
    select.appendChild(option);
  }
  const custom = document.createElement("option");
  custom.value = "__new__";
  custom.textContent = "+ New category…";
  select.appendChild(custom);
}

// "" → null (AI decides); "__new__" → ask for a name; else the value.
// Returns undefined when the user cancels the prompt.
async function resolveCategoryChoice(select) {
  if (select.value === "") return null;
  if (select.value !== "__new__") return select.value;
  // promptDialog resolves to trimmed text, or "" for cancel: one shape for
  // both, so there is no null to check the way window.prompt needed.
  const name = await promptDialog("Name for the new category:", "", { confirmLabel: "Create" });
  return name || undefined;
}

function beginOrCompleteLink(entry) {
  //: **A draft and a saved note cannot be connected**, asked for directly,
  //: and refused by `manager.create_link` whichever route asks. Caught here as
  //: well so the answer arrives before the click that would fail: starting a
  //: link from a draft and hunting for a target, only to be told no at the
  //: end, is the worst order to learn a rule in.
  //:
  //: Two drafts are still fine; the rule is that drafts stay separate from the
  //: notebook, not from each other.
  if (linkSource !== null && linkSource !== entry.id) {
    const source = allEntries.find((e) => e.id === linkSource);
    if (source && Boolean(source.is_draft) !== Boolean(entry.is_draft)) {
      const draftFirst = Boolean(source.is_draft);
      linkSource = null;
      renderEntries();
      toast(
        draftFirst
          ? "A draft can't be linked to a saved note. Save the draft first."
          : "A saved note can't be linked to a draft. Save the draft first.",
        true
      );
      return;
    }
  }
  if (linkSource === null) {
    linkSource = entry.id;
    toast("Now click Link on the entry you want to connect it to (Esc cancels).");
    renderEntries();
    return;
  }
  if (linkSource === entry.id) {
    linkSource = null; // clicked the same one again = cancel
    renderEntries();
    return;
  }
  const source = linkSource;
  const target = entry.id;
  linkSource = null;
  apiJson(`/entries/${source}/links`, {
    method: "POST",
    body: JSON.stringify({ target_id: target }),
  })
    .then((updated) => {
      toast("Linked!");
      let liveLinkId = updated.links.find((l) => l.entry_id === target)?.link_id;
      pushUndo(
        "Linked two notes",
        async () => {
          if (liveLinkId == null) return;
          await api(`/entries/${source}/links/${liveLinkId}`, { method: "DELETE" });
          await loadEntries();
        },
        async () => {
          const redone = await apiJson(`/entries/${source}/links`, {
            method: "POST",
            body: JSON.stringify({ target_id: target }),
          });
          liveLinkId = redone.links.find((l) => l.entry_id === target)?.link_id ?? liveLinkId;
          await loadEntries();
        }
      );
      return loadEntries();
    })
    .catch((error) => {
      toast(error.message, true);
      renderEntries();
    });
}

// Text filter (Wave J): match note content or any tag, case-insensitive.
// --- the notes filter ------------------------------------------------------------
// Same lesson as the server's keyword search: a single substring match means
// the words have to be typed in the order they appear, which nobody can guess.
// This one also understands a few operators, because narrowing by tag or
// category is the thing you actually want once you have more than a few
// hundred notes: and it needs no AI whatsoever.
//
//   tag:work            only notes tagged "work"
//   cat:recipes         only notes in that category (category: also works)
//   is:favourite        favourite (is:pinned too) / private / linked / untagged
//   tags:<2             fewer than 2 tags, also <=, >, >=, = (or bare N)
//   -picnic             notes that do NOT mention "picnic"
//   "exact phrase"      that phrase, verbatim
//
// Anything else is a plain word: all of them must appear, in any order.

// `tags:<2`, `tags:<=1`, `tags:0` and so on: "how many tags", not "which
// ones" (that's plain `tag:`). Asked for directly: a way to find the notes
// that only ever got the janitor's default filing and never a second look,
// since `is:untagged` alone only ever answered the zero case.
const TAG_COUNT_RE = /^tags:(<=|>=|<|>|=)?(\d+)$/;

//: **The Notes tab, filtered, from anywhere.** The palette's "Show untagged
//: notes", the dashboard's Loose ends widget and the untagged nudge in the
//: bell all land here (INBOX 162: "notes with no tags or other things arent
//: highlighted"): one route to "the notes I mean" rather than three copies
//: of the same four lines.
function showNotesFilter(query) {
  switchTab("notes");
  const search = $("note-search");
  search.value = query;
  search.dispatchEvent(new Event("input"));
  search.focus();
}

function parseNoteQuery(raw) {
  const query = {
    words: [],
    phrases: [],
    exclude: [],
    tags: [],
    categories: [],
    flags: [],
    tagCount: null,
  };
  // Pull quoted phrases out first so their spaces don't become word breaks.
  const remainder = (raw || "").replace(/"([^"]+)"/g, (_, phrase) => {
    query.phrases.push(phrase.toLowerCase().trim());
    return " ";
  });
  for (const token of remainder.split(/\s+/)) {
    if (!token) continue;
    const lower = token.toLowerCase();
    const tagCountMatch = TAG_COUNT_RE.exec(lower);
    if (lower.startsWith("tag:")) query.tags.push(lower.slice(4));
    else if (lower.startsWith("category:")) query.categories.push(lower.slice(9));
    else if (lower.startsWith("cat:")) query.categories.push(lower.slice(4));
    else if (lower.startsWith("is:")) query.flags.push(lower.slice(3));
    else if (tagCountMatch) {
      query.tagCount = { op: tagCountMatch[1] || "=", n: Number(tagCountMatch[2]) };
    } else if (lower.startsWith("-") && lower.length > 1) query.exclude.push(lower.slice(1));
    else query.words.push(lower);
  }
  return query;
}

function noteQueryIsEmpty(query) {
  return (
    !query.words.length &&
    !query.phrases.length &&
    !query.exclude.length &&
    !query.tags.length &&
    !query.categories.length &&
    !query.flags.length &&
    !query.tagCount
  );
}

function matchesTagCount(tagCount, n) {
  switch (tagCount.op) {
    case "<":
      return n < tagCount.n;
    case "<=":
      return n <= tagCount.n;
    case ">":
      return n > tagCount.n;
    case ">=":
      return n >= tagCount.n;
    default:
      return n === tagCount.n;
  }
}

function matchesSearch(entry) {
  if (!noteSearch) return true;
  const query = parseNoteQuery(noteSearch);
  if (noteQueryIsEmpty(query)) return true;

  const content = (entry.content || "").toLowerCase();
  const tags = (entry.tags || []).map((t) => t.toLowerCase());
  const category = (entry.category || "").toLowerCase();
  const haystack = `${content} ${tags.join(" ")}`;

  // A tag: or cat: filter is a statement about which notes count at all.
  if (query.tags.length && !query.tags.every((t) => tags.some((tag) => tag.includes(t)))) {
    return false;
  }
  if (query.categories.length && !query.categories.some((c) => category.includes(c))) {
    return false;
  }
  for (const flag of query.flags) {
    //: `is:favourite` is the name the rest of the app now uses; `is:pinned` is
    //: kept because it is in this app's own help text, in saved filters people
    //: already have, and in muscle memory. Two spellings of one flag is a
    //: smaller cost than breaking a filter somebody saved.
    if ((flag === "pinned" || flag === "favourite" || flag === "favourites") && !entry.pinned) {
      return false;
    }
    if (flag === "private" && !entry.is_private) return false;
    if (flag === "linked" && !(entry.links || []).length) return false;
    if (flag === "untagged" && tags.length) return false;
  }
  if (query.tagCount && !matchesTagCount(query.tagCount, tags.length)) return false;
  if (query.exclude.some((word) => haystack.includes(word))) return false;
  if (!query.phrases.every((phrase) => content.includes(phrase))) return false;
  // Every word must appear somewhere, in any order.
  return query.words.every((word) => haystack.includes(word));
}

// Write `text` into `element`, wrapping each matched term in a <mark>.
// Never uses innerHTML: a note containing "<script>" is text, not markup.
// Render note text with [[wiki links]] as clickable chips and search terms
// marked. Splits on the links first so a highlight can't land inside one.
// Inline markdown in note text, and deliberately only the inline kind.
//
// Reported: notes show raw `**text**` while chat answers, documents and the
// dashboard digest all render markdown. They render it with renderMarkdown,
// which also does headings, tables, lists and fenced code, and a list of
// notes rendered that way gets very tall very fast, which is a worse problem
// than the one being fixed. What people actually type in a note is bold, a
// little italic, and the odd `code` span.
//
// Order matters: code spans are matched first and their contents are never
// looked at again, so `**not bold**` inside backticks stays literal.
// Underscore italics are left out on purpose, snake_case_names are common in
// notes and `_` italics would eat them.
//
// Images and links, added after the original four groups rather than before
// them, so existing callers keyed to `m[1]`–`m[4]` (`notePreviewText` below)
// keep working unchanged. This is what an uploaded image actually looks like
// once pasted/dropped/attached (`![name](/media/hash.ext)`, per
// `handleFileUpload`), and until now nothing in the note-card list rendered
// either form at all, so it showed as the literal markdown source, brackets
// and all. Both accept a same-origin relative URL as well as `https?://`:
// unlike `appendInline`'s own link pattern (chat/documents, which only ever
// links *out*), a note's images live at `/media/...` on this same server.
//
// **The two link/image alternatives are length-bounded, and that is not
// cosmetic.** `\[([^\]\n]+)\]\(...\)` against text with an unclosed `[`
// makes the engine consume to the end of the line and back off one
// character at a time looking for a `]` that isn't there: once per start
// position, so O(n²) on a note that is entirely user-controlled text. That
// is CodeQL's `js/polynomial-redos`, and this file's own `[[wiki link]]`
// pattern already bounds itself (`{1,120}`) for exactly this reason. The
// caps are far past any real link (200 characters of link text, 500 of
// URL) and turn the per-position work into a constant.
// `==highlighted text==`, asked for directly ("a highlighting text
// feature in notes and documents"). An inline markdown convention, not a
// new data model: the same choice every other bit of note formatting here
// already made (**bold**, ~~strike~~, [[wiki links]]): a highlight is
// still just characters in the note's own plain-text `content`, so it
// needs no new column, no span-range table, and works everywhere that
// content already goes (search, the AI's own reading of a note, export).
// Bounded the same way `~~…~~` is (excludes its own delimiter and `\n`
// inside the class) rather than the link/image alternatives' explicit
// length caps: the reason those need one (an unbounded `[^\]\n]+` against
// unclosed `[` is O(n²), CodeQL's js/polynomial-redos) doesn't apply to a
// class that already excludes its own closing character.
// The colour set here is the same eight the toolbars offer (MD_COLOURS in
// documents.js) and the same eight that have stylesheet rules. Keeping the
// three in step matters: this listed only six for a while, so picking Red or
// Grey from the highlight menu wrote `==red|text==`, the optional-colour group
// declined to match "red|", and the note rendered the literal text "red|text"
// in a yellow highlight. Adding a colour means all three, or the new one
// silently prints its own name. tests/test_highlight_colours.py pins them.
const INLINE_MD =
  /`([^`\n]+)`|\*\*([^*\n]+?)\*\*|~~([^~\n]+?)~~|==(?:(yellow|green|blue|pink|purple|orange|red|grey)\|)?([^=\n]+?)==|\+\+(yellow|green|blue|pink|purple|orange|red|grey)\|([^+\n]+?)\+\+|\*([^*\n]+?)\*|!\[([^\]\n]{0,200})\]\(([^)\n]{1,500})\)|\[([^\]\n]{1,200})\]\(([^)\n]{1,500})\)/g;

// `appendInline`'s own grammar, before it was merged into renderInlineMarkdown
// below: adds `__bold__`/`_italic_` and bare `https://…` autolinking, and its
// character classes don't stop at a newline. Kept as a **textually separate**
// pattern rather than folded into INLINE_MD behind an "underscore syntax"
// flag applied after matching, appendInline's callers (block-markdown
// lines, already split on "\n" and rejoined with spaces before this ever
// runs) never feed it a newline, so the missing `\n` exclusion is invisible
// in practice, but a shared superset pattern would make renderInlineMarkdown
// start matching `_word_`/bare URLs it doesn't today, splitting its plain
// prose runs differently and changing exactly what substring a caller that
// passes search `terms` ever hands to highlightInto. Two literal patterns,
// selected by `options.underscoreSyntax` below, guarantee neither caller's
// matching behaviour moves at all.
const INLINE_MD_LEGACY =
  /`([^`]+)`|\*\*([^*]+)\*\*|__([^_]+)__|~~([^~]+)~~|==(?:(yellow|green|blue|pink|purple|orange|red|grey)\|)?([^=]+?)==|\+\+(yellow|green|blue|pink|purple|orange|red|grey)\|([^+]+?)\+\+|\*([^*]+)\*|(?<![\w])_([^_]+)_(?![\w])|!\[([^\]]{0,200})\]\(([^)\s]{1,500})\)|\[([^\]]{1,200})\]\(([^)\s]{1,500})\)|(https?:\/\/[^\s)]+)/g;

// Same allowlist an <img src> or <a href> built from note text has to pass:
// an absolute http(s) URL, or a same-origin relative path (one leading
// slash, not two: `//evil.com/x` is also "one string starting with /" but
// is a protocol-relative link off this origin). Rejects `javascript:`,
// `data:`, and anything else a pasted note could contain.
function isRenderableUrl(url) {
  //: `staged:` is this app's own scheme for a picture whose bytes are still
  //: in the browser (see `captureStagedImages`), renderable, because the
  //: preview draws it from the Blob, and never saved, because the save path
  //: rewrites every one of them to a real url first.
  if (typeof url === "string" && url.startsWith(STAGED_URL_PREFIX)) return true;
  return /^https?:\/\//i.test(url) || (url.startsWith("/") && !url.startsWith("//"));
}

// A non-image attachment (handleFileUpload's link-syntax branch) previously
// rendered as a bare link, indistinguishable at a glance from an ordinary
// URL: BACKLOG §4's "genuinely still open" follow-up. Only applied to our
// own /media/ uploads, not arbitrary external links, since a random web
// page's URL extension says nothing reliable about its content.
const ATTACHMENT_ICONS = {
  pdf: "ph-file-pdf", doc: "ph-file-doc", docx: "ph-file-doc", rtf: "ph-file-doc",
  xls: "ph-file-xls", xlsx: "ph-file-xls", csv: "ph-file-csv",
  ppt: "ph-file-ppt", pptx: "ph-file-ppt",
  zip: "ph-file-archive", rar: "ph-file-archive", "7z": "ph-file-archive",
  mp3: "ph-file-audio", wav: "ph-file-audio", ogg: "ph-file-audio", m4a: "ph-file-audio", webm: "ph-file-audio",
  mp4: "ph-file-video", mov: "ph-file-video",
  txt: "ph-file-text", md: "ph-file-md", json: "ph-file-code",
  png: "ph-file-image", jpg: "ph-file-image", jpeg: "ph-file-image",
  gif: "ph-file-image", webp: "ph-file-image", heic: "ph-file-image", heif: "ph-file-image",
};

// `name` is optional and only matters for a `/files/{id}` URL: the
// note-attachment download endpoint, opaque and extension-less by design
// (unlike `/media/<filename>.ext`, which pasted/dropped inline images use).
// Without it, a note's attached PDF/docx/etc. had no extension anywhere in
// its URL to read a type from, so every non-image attachment fell through
// to nothing rendering at all wherever a caller built the URL that way.
function attachmentIconClass(url, name) {
  const source = name || (url.startsWith("/media/") ? url : "");
  if (!source) return null;
  const ext = source.split(".").pop().split(/[?#]/)[0].toLowerCase();
  return ATTACHMENT_ICONS[ext] || "ph-file";
}

//: Extensions the file card labels by name rather than by the generic
//: "File", the type is the second most useful thing about a file after
//: what it is called, and "PDF · Open" reads as a thing you can do where
//: "myfile.pdf" alone reads as text that happens to end in .pdf.
const FILE_KIND_LABELS = {
  pdf: "PDF", doc: "Word", docx: "Word", odt: "Document", rtf: "Document",
  xls: "Sheet", xlsx: "Sheet", ods: "Sheet", csv: "CSV",
  ppt: "Slides", pptx: "Slides", odp: "Slides",
  txt: "Text", md: "Markdown", markdown: "Markdown",
  json: "JSON", xml: "XML", yaml: "YAML", yml: "YAML",
  html: "HTML", htm: "HTML", css: "CSS",
  js: "Code", ts: "Code", jsx: "Code", tsx: "Code", py: "Code", java: "Code",
  c: "Code", h: "Code", cpp: "Code", hpp: "Code", cs: "Code", go: "Code",
  rs: "Code", rb: "Code", php: "Code", sh: "Code", sql: "SQL",
  swift: "Code", kt: "Code",
  zip: "Archive", mp3: "Audio", wav: "Audio", m4a: "Audio",
  mp4: "Video", mov: "Video", webm: "Video",
};

function fileKindLabel(url, name) {
  const source = name || url;
  const ext = source.split(".").pop().split(/[?#]/)[0].toLowerCase();
  return FILE_KIND_LABELS[ext] || "File";
}

/** A file attached to a note, rendered as something you can see and act on.
 *
 * Three affordances, and each one is a thing that was missing rather than a
 * flourish: **open** (the card itself, into the lightbox's document viewer: 
 * the fix for the 401 dead end described at the call site), **save** (the
 * only way to get the bytes out, since a plain link cannot authenticate),
 * and the **type and name**, so a note full of files reads as a list of
 * files instead of a paragraph of blue text.
 *
 * Deliberately not a `<a>` at all. An anchor to `/media/…` is the bug; an
 * anchor with a token in the query string would put an unlock credential
 * into anything that logs or copies a URL. A button that fetches with the
 * header, like every other call in this app, has neither problem.
 */
/** The one-line form of `fileCard`, for a surface too small for a card. */
function fileChip(name, url) {
  const label = name && name !== url ? name : url.split("/").pop();
  const chipEl = document.createElement("span");
  chipEl.className = "chip file-chip";
  setLabel(chipEl, `${(attachmentIconClass(url, name) || "ph-file").replace("ph-", "ph:")} ${label}`);
  chipEl.title = `${fileKindLabel(url, name)}: ${label}`;
  return chipEl;
}

function fileCard(name, url) {
  const label = name && name !== url ? name : url.split("/").pop();
  const card = document.createElement("span");
  card.className = "file-card";

  const open = document.createElement("button");
  open.type = "button";
  open.className = "file-card-open";
  open.title = `Open “${label}”`;
  const icon = document.createElement("i");
  icon.className = `ph ${attachmentIconClass(url, name) || "ph-file"} file-card-icon`;
  icon.setAttribute("aria-hidden", "true");
  const text = document.createElement("span");
  text.className = "file-card-text";
  const nameEl = document.createElement("span");
  nameEl.className = "file-card-name";
  nameEl.textContent = label;
  const kindEl = document.createElement("span");
  kindEl.className = "file-card-kind";
  kindEl.textContent = fileKindLabel(url, name);
  text.append(nameEl, kindEl);
  open.append(icon, text);
  open.addEventListener("click", () => {
    openLightbox([{ filename: label, getUrl: () => mediaSrc(url) }], 0);
  });

  const save = document.createElement("button");
  save.type = "button";
  save.className = "ghost small icon-only file-card-save";
  setLabel(save, "ph:download-simple");
  save.title = `Save “${label}” to disk`;
  save.setAttribute("aria-label", save.title);
  save.addEventListener("click", async (event) => {
    event.stopPropagation();
    try {
      const response = await api(url);
      await saveFile(label, await response.blob());
    } catch (error) {
      toast(error.message || `Couldn't save “${label}”.`, true);
    }
  });

  card.append(open, save);
  return card;
}

// LaTeX escapes that models reach for when they want a symbol (§35H).
//
// Screenshotted: a bullet reading "Jokes $\rightarrow$ Social Skills", with
// the LaTeX printed literally. That is not a markdown gap, the model was
// asked for an arrow and reached for the notation it saw most in training.
// Rendering a whole maths engine for this would be absurd; translating the
// dozen symbols that actually show up costs nothing and covers all of it.
//
// The prompt also asks for plain Unicode, which prevents most of these. This
// is the half that catches the model doing it anyway.
const LATEX_SYMBOLS = {
  rightarrow: "\u2192", to: "\u2192", longrightarrow: "\u27f6", Rightarrow: "\u21d2",
  leftarrow: "\u2190", gets: "\u2190", Leftarrow: "\u21d0",
  leftrightarrow: "\u2194", Leftrightarrow: "\u21d4", uparrow: "\u2191", downarrow: "\u2193",
  times: "\u00d7", div: "\u00f7", pm: "\u00b1", mp: "\u2213", cdot: "\u00b7",
  leq: "\u2264", le: "\u2264", geq: "\u2265", ge: "\u2265",
  neq: "\u2260", ne: "\u2260", approx: "\u2248", equiv: "\u2261", sim: "\u223c",
  ldots: "\u2026", dots: "\u2026", cdots: "\u22ef",
  infty: "\u221e", deg: "\u00b0", bullet: "\u2022", star: "\u2605",
  checkmark: "\u2713", surd: "\u221a", propto: "\u221d", therefore: "\u2234",
  alpha: "\u03b1", beta: "\u03b2", gamma: "\u03b3", delta: "\u03b4",
  lambda: "\u03bb", mu: "\u03bc", pi: "\u03c0", sigma: "\u03c3", omega: "\u03c9",
  Delta: "\u0394", Sigma: "\u03a3", Omega: "\u03a9",
};

//: **Inline maths, `$formula$` on one line** (INBOX 423c). Mirrors the
//: block delimiter's own currency guard (see `mdMathBlockFrom`'s comment):
//: no space just inside either `$` (a genuine `$ x $` is vanishingly rare
//: and a stray space is nearly always somebody's sentence), and the closing
//: `$` may not be immediately followed by a digit or a second `$` (a price
//: range, "$20 and $30", or a `$$…$$` display block's own second dollar).
//: The two lookarounds around the *opening* `$` (`(?<!\$)`, `(?!\$|\s)`) are
//: what keeps this from ever matching inside a `$$…$$` run at all: both
//: dollars of that pair fail one side or the other, so a display block is
//: never mistaken for two stray inline ones. Read by `unlatex` (which
//: decides what survives to be drawn as maths) and by `renderInlineMarkdown`
//: (which actually draws it); the same object so the two can never
//: disagree about what counts.
const INLINE_MATH_RE = /(?<!\$)\$(?!\$|\s)([^$\n]{1,300}?)(?<!\s)\$(?!\$|\d)/g;

function unlatex(text) {
  // The overwhelmingly common case: nothing to do, and not worth two regex
  // passes over every note and every streaming frame to find that out.
  if (!text || (!text.includes("\\") && !text.includes("$"))) return text;
  const swap = (s) =>
    s.replace(/\\([A-Za-z]+)/g, (whole, name) =>
      Object.prototype.hasOwnProperty.call(LATEX_SYMBOLS, name)
        ? LATEX_SYMBOLS[name]
        : whole
    );
  // The old rule, for everything INLINE_MATH_RE does not claim below:
  // inline maths delimiters are dropped only when the span is actually
  // maths *and* everything in it became plain characters.
  //
  // Both halves are load-bearing. Without the first, "cost $5 and $10 today"
  // is a matching span containing no commands, and the dollars vanish, a
  // notebook full of prices is a much more likely thing than a notebook full
  // of LaTeX. Without the second, a span still holding \frac or \sum gets
  // stripped of its delimiters and left as half-translated notation, which is
  // worse than leaving it alone: the user can at least read the source.
  const swapDollarSpans = (s) =>
    s.replace(/\$([^$\n]{1,200})\$/g, (whole, inner) => {
      if (!/\\[A-Za-z]/.test(inner)) return whole; // not maths: currency, prose
      const plain = swap(inner);
      return /\\[A-Za-z]/.test(plain) ? whole : plain;
    });
  //: A span INLINE_MATH_RE claims is carried through byte for byte, dollar
  //: signs and all: `renderInlineMarkdown` draws it as real maths, through
  //: the same TeX-to-MathML renderer the `$$` blocks already use, rather
  //: than this function reducing it to a Unicode stand-in symbol (what used
  //: to happen to `$\alpha$`, and what always happened to `$x$`: it has no
  //: `\command` for the old rule above to even notice). Everything between
  //: two such spans still gets the old rule, which is why this walks the
  //: text in segments instead of running one `.replace` over the whole
  //: string: the old rule's own `$…$` regex is looser than INLINE_MATH_RE
  //: (no spacing or digit guard) and would otherwise re-match and mangle
  //: the very span just carried through.
  INLINE_MATH_RE.lastIndex = 0;
  let out = "";
  let cursor = 0;
  let m;
  while ((m = INLINE_MATH_RE.exec(text))) {
    out += swap(swapDollarSpans(text.slice(cursor, m.index))) + m[0];
    cursor = INLINE_MATH_RE.lastIndex;
  }
  out += swap(swapDollarSpans(text.slice(cursor)));
  return out;
}

// `compact`: skip the actual <img> and show the alt text instead, for a
// label-sized surface (a link chip, a document sidebar button) where a
// note's own image markdown would otherwise cram a thumbnail into a spot
// sized for a line of text. The note card's own body always gets the real
// image; everywhere smaller gets the same treatment `notePreviewText`
// already gives one to a plain-text preview.
//
// `options` is where appendInline's five real behavioural differences from
// the note-card grammar live, now that the two hand-rolled parsers (each
// with its own separately maintained `isRenderableUrl` call, per
// ROADMAP.md §0/§2) are one function:
//   - `dismissible` (default true): render an image with the note-card
//     delete/lightbox chrome. appendInline's callers (chat, documents, table
//     cells) pass false: there is no note markdown line for a "remove this
//     image" click to edit there, so they get a plain <img>.
//   - `autolinkBareUrls` (default false): turn a plain `https://…` run into
//     a real link. Off for note cards (unchanged), on for appendInline.
//   - `underscoreSyntax` (default false): also recognize `__bold__`/
//     `_italic_` and bare-URL autolinking, using INLINE_MD_LEGACY instead of
//     INLINE_MD: see that constant's comment for why this is a second
//     literal pattern rather than a superset with the extra alternatives
//     suppressed after matching.
//   - `strikeTag` (default "s"): appendInline's callers always used <del>,
//     not the note-card renderer's <s>; style.css has separate rules for
//     `.entry-content s` vs `.answer/.bubble-answer/.dash-body del`.
//   - `applyLatex` (default true): appendInline never ran unlatex() on its
//     text, so it stays off for that mode to keep behaviour unchanged.
// Every default matches renderInlineMarkdown's original, options-less
// behaviour exactly, so no existing call site needs to change.
// The allow-list for anything a note's own text can turn into an href:
// web links, mail, this app's own paths and in-page anchors. Everything
// else (javascript:, data:, vbscript:, file:) becomes a dead link rather
// than a live one. Kept beside the renderer that needs it.
function safeHref(url) {
  const value = String(url || "").trim();
  if (/^(https?:|mailto:|tel:)/i.test(value)) return value;
  if (/^[/#?.]/.test(value) || !/^[a-z][a-z0-9+.-]*:/i.test(value)) return value;
  return "#";
}

//: **CommonMark's angle-bracket autolink, `<https://example.com>`.** INBOX
//: 81: "Web search results in the Sources dropdown: links rendered as
//: Markdown links", with a screenshot of a model's table showing the raw
//: `<https://...>` text. Neither inline pattern here has ever matched that
//: form, so it fell through to plain prose and the reader saw the brackets.
//:
//: Rewritten to `[url](url)` *before* matching rather than added as another
//: alternative to `INLINE_MD`. That pattern's capture groups are addressed by
//: number in the renderer below, and its own comment records a bug where two
//: indices were off by two and every image in the app rendered "undefined":
//: adding a group in the middle of it is exactly how that happens again. A
//: pre-pass cannot move an index.
//:
//: Only http and https, which is the same allowlist `isRenderableUrl`
//: applies afterwards; the point of the check here is to leave anything else
//: (an HTML tag, `<3`, a generic like `Array<T>`) exactly as it was.
function expandAngleAutolinks(text) {
  return String(text || "").replace(
    /<(https?:\/\/[^\s<>]{1,500})>/g,
    (whole, url) => `[${url}](${url})`,
  );
}

//: What a bare URL is shown as: the host without its `www.`, then the path
//: shortened to its last meaningful segment, so
//: `https://www.goodreads.com/series/319859-he-who-fights-with-monsters`
//: reads "goodreads.com / …he-who-fights-with-monsters". The query string and
//: fragment are dropped from the label (never from the link): they are
//: tracking and position, not identity. A string the URL parser refuses comes
//: back as it was, so a malformed address is still shown rather than hidden.
const READABLE_URL_SEGMENT = 40;

function readableUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  const host = parsed.hostname.replace(/^www\./i, "");
  const segments = parsed.pathname.split("/").filter(Boolean);
  if (!segments.length) return host;
  let last = decodeURIComponent(segments[segments.length - 1]);
  if (last.length > READABLE_URL_SEGMENT) last = last.slice(0, READABLE_URL_SEGMENT - 1) + "\u2026";
  //: An ellipsis stands in for the middle of a deep path, so "site / … / page"
  //: still says there was more between them.
  return segments.length > 1 ? `${host} / \u2026 / ${last}` : `${host} / ${last}`;
}

function renderInlineMarkdown(element, text, terms, compact = false, options = {}) {
  const { underscoreSyntax = false, applyLatex = true } = options;
  // appendInline never cleared `element`, it only ever appended into a
  // freshly created element, except the task-list-checkbox case, which
  // appends a <input type=checkbox> *before* calling appendInline on the
  // rest of the item text. A `replaceChildren()` here would delete that
  // checkbox out from under it, so the note-card renderer's clear-first
  // behaviour is kept only for its own (non-legacy) callers.
  if (!underscoreSyntax) element.replaceChildren();
  if (applyLatex) text = unlatex(text);
  text = expandAngleAutolinks(text);
  //: **Inline maths, cut out before the `**bold**`/`` `code` ``/link
  //: grammar below ever sees it** (INBOX 423c). A span INLINE_MATH_RE
  //: claims (its own comment has the exact rule) is drawn by the same
  //: TeX-to-MathML renderer the `$$` blocks use, one run of ordinary
  //: grammar-matching per gap between formulas rather than one run over the
  //: whole string, so `**bold**` either side of a formula still matches.
  //: A formula *inside* `**bold $x$ text**` does not come out bold: that
  //: would need maths as a token of the grammar below rather than a cut
  //: made before it runs, and nothing reported here asked for that.
  INLINE_MATH_RE.lastIndex = 0;
  let mathCursor = 0;
  let mathMatch;
  let sawMath = false;
  while ((mathMatch = INLINE_MATH_RE.exec(text))) {
    sawMath = true;
    if (mathMatch.index > mathCursor) {
      appendInlineRun(element, text.slice(mathCursor, mathMatch.index), terms, compact, options);
    }
    element.appendChild(mdInlineMathElement(mathMatch[1].trim()));
    mathCursor = INLINE_MATH_RE.lastIndex;
  }
  if (sawMath) {
    if (mathCursor < text.length) appendInlineRun(element, text.slice(mathCursor), terms, compact, options);
    return;
  }
  appendInlineRun(element, text, terms, compact, options);
}

//: The `**bold**`/`` `code` ``/link/image/highlight/bare-url grammar,
//: over one run of text `renderInlineMarkdown` has already established
//: holds no inline maths. Never clears `element`: a run is one piece of a
//: larger call that may already have appended earlier runs and maths nodes.
function appendInlineRun(element, text, terms, compact, options) {
  const { dismissible = true, autolinkBareUrls = false, underscoreSyntax = false, strikeTag = "s" } = options;
  const pattern = new RegExp((underscoreSyntax ? INLINE_MD_LEGACY : INLINE_MD).source, "g");
  let cursor = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      const chunk = text.slice(cursor, match.index);
      // Same reasoning as the clear-first skip above: appendInline appended
      // plain prose as a bare text node, never wrapped in a <span> (it never
      // had search terms to mark). Keeping that distinction means neither
      // mode's DOM shape moves for its own callers.
      if (underscoreSyntax) {
        element.appendChild(document.createTextNode(chunk));
      } else {
        const before = document.createElement("span");
        highlightInto(before, chunk, terms);
        element.appendChild(before);
      }
    }
    let code, bold, strike, markColour, mark, inkColour, ink, italic, imageAlt, imageUrl, linkText, linkUrl, bareUrl;
    if (underscoreSyntax) {
      let boldStar, boldUnderscore, italicStar, italicUnderscore;
      [
        , code, boldStar, boldUnderscore, strike, markColour, mark, inkColour, ink, italicStar, italicUnderscore,
        imageAlt, imageUrl, linkText, linkUrl, bareUrl,
      ] = match;
      bold = boldStar ?? boldUnderscore;
      italic = italicStar ?? italicUnderscore;
    } else {
      [, code, bold, strike, markColour, mark, inkColour, ink, italic, imageAlt, imageUrl, linkText, linkUrl] = match;
    }
    // Images and links are their own element kinds, not a wrap-in-a-tag like
    // the four above: built and appended directly rather than falling
    // through to the generic `tag`/`node` shape below, since neither one
    // takes searched-term highlighting inside it (an <img> has no text to
    // highlight, and a link's own text isn't split into marks any more than
    // a code span's is).
    if (imageUrl !== undefined) {
      if (compact) {
        element.appendChild(document.createTextNode(imageAlt || "Image"));
      } else if (isRenderableUrl(imageUrl)) {
        if (!dismissible) {
          const img = document.createElement("img");
          img.src = mediaSrc(imageUrl);
          img.alt = imageAlt || "";
          img.className = "entry-inline-image";
          img.loading = "lazy";
          element.appendChild(img);
          cursor = pattern.lastIndex;
          continue;
        }
        const wrapper = document.createElement("span");
        wrapper.className = "thumb-wrap";
        const img = document.createElement("img");
        img.src = mediaSrc(imageUrl);
        img.alt = imageAlt || "";
        img.className = "attachment-thumb";
        img.loading = "lazy";
        img.style.cursor = "zoom-in";
        img.addEventListener("click", (e) => {
          e.stopPropagation();
          openLightbox([{ filename: imageAlt || "Image", getUrl: () => mediaSrc(imageUrl) }], 0);
        });
        const dismissBtn = document.createElement("span");
        dismissBtn.className = "unlink";
        dismissBtn.title = "Remove image from note";
        setLabel(dismissBtn, "ph:x"); // raw "×" glyph vs Phosphor icon font mismatch mis-centers the icon
        // `match` is one `let` binding reused by every pass of the while
        // loop above (a `while` reassigns it, unlike a `for (let x of …)`'s
        // fresh-per-iteration binding): every dismiss button's closure
        // shared the same variable, and by the time anyone actually clicked
        // one, the loop had long since finished with `match` sitting at
        // `null` (the value that ends the `while` condition). Every click
        // threw `Cannot read properties of null (reading '0')` before the
        // confirm dialog could even open, reported as "the remove button
        // doesn't work". Capturing the text this match actually matched
        // into its own const, right here in the loop body, gives each
        // button's closure the value for *its own* image instead of
        // whatever `match` happened to hold after parsing ended.
        const originalText = match[0];
        dismissBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          wrapper.dispatchEvent(new CustomEvent("remove-inline-image", {
            bubbles: true,
            detail: { originalText }
          }));
        });
        makeUnlinkAccessible(dismissBtn);
        wrapper.appendChild(img);
        wrapper.appendChild(dismissBtn);
        // Asked for directly: a deleted image left a broken-image glyph in
        // the note that referenced it, a closable "deleted" box instead.
        // Only dismisses the placeholder from this render; the note's own
        // markdown line is left alone; editing it back out is a further,
        // separate feature.
        img.addEventListener("error", () => {
          const placeholder = document.createElement("span");
          placeholder.className = "entry-inline-image-deleted";
          placeholder.append(document.createTextNode(`${imageAlt || "Image"} deleted`));
          const dismiss = document.createElement("span");
          dismiss.className = "unlink";
          dismiss.title = "Dismiss";
          setLabel(dismiss, "ph:x"); // raw "×" glyph vs Phosphor icon font mismatch mis-centers the icon
          dismiss.addEventListener("click", (e) => { e.stopPropagation(); placeholder.remove(); });
          makeUnlinkAccessible(dismiss);
          placeholder.appendChild(dismiss);
          wrapper.replaceWith(placeholder);
        });
        element.appendChild(wrapper);
      } else {
        element.appendChild(document.createTextNode(match[0]));
      }
      cursor = pattern.lastIndex;
      continue;
    }
    if (linkUrl !== undefined) {
      if (isRenderableUrl(linkUrl)) {
        const iconClass = attachmentIconClass(linkUrl);
        if (iconClass) {
          // **A file, not a link, and this fixes a dead end, not just the
          // looks.** Reported directly: "once I uploaded two files into a
          // note, they became hyperlinked text, I clicked on them, and it
          // took me to a black fode screen with some text about needing to
          // unlock first… there was no way for me to go back except for
          // closing the application entirely."
          //
          // That is exactly what an `<a href="/media/x.pdf">` does here. A
          // plain navigation carries no `X-Auth-Token` header: only
          // `apiJson` and `mediaSrc` attach one: so the browser leaves the
          // single-page app, gets the unlock guard's 401 JSON body, and
          // renders it with its own JSON viewer. The app is gone, and in the
          // desktop shell there is no back button to bring it back.
          //
          // The lightbox already reads this exact file: `show()` sniffs a
          // `/media/…` url that is not an image and hands it to the document
          // viewer, which renders PDFs, Office files, code and plain text
          // through `/media/text`. Nothing routed a note's own files to it, 
          // that missing wire is the whole bug.
          // `compact` is the same label-sized-surface case the image branch
          // above uses it for: a dashboard preview row or a link chip has
          // room for a line of text, not a two-line card with its own
          // buttons. The name and the type still say what it is.
          element.appendChild(
            compact ? fileChip(linkText, linkUrl) : fileCard(linkText, linkUrl)
          );
        } else {
          const a = document.createElement("a");
          // Only schemes a note may point at. A `[x](javascript:...)` link
          // would otherwise be a click-to-run script in a note that came
          // from an import or a shared file; the CSP blocks it today, and
          // this is the second lock in case the CSP is ever loosened.
          a.href = safeHref(linkUrl);
          if (/^https?:\/\//i.test(linkUrl)) {
            a.target = "_blank";
            a.rel = "noopener noreferrer";
          }
          //: `[https://x.com/a/b](https://x.com/a/b)` is how a model writes a
          //: bare URL when it has been told to use markdown: the same address
          //: twice, and the same wall of slug on screen. Shown as the bare
          //: form is (see `readableUrl` below); a link whose words differ from
          //: its address is a real label and is left alone.
          const labelIsTheUrl = linkText.trim() === linkUrl.trim();
          if (labelIsTheUrl) a.title = linkUrl;
          highlightInto(a, labelIsTheUrl ? readableUrl(linkUrl) : linkText, terms);
          element.appendChild(a);
        }
      } else {
        element.appendChild(document.createTextNode(match[0]));
      }
      cursor = pattern.lastIndex;
      continue;
    }
    if (bareUrl !== undefined) {
      if (autolinkBareUrls) {
        const a = document.createElement("a");
        a.href = bareUrl;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        //: The address is the tooltip; the words are the site and the path.
        //: Asked for with a screenshot of an answer that tabulated five
        //: results by their raw URLs, each one a hundred characters of
        //: `https://www.` and slug, overflowing the bubble sideways: "is it
        //: possible to better render the links that the ai writes??" A model
        //: writes bare URLs constantly and nobody reads a URL; they read where
        //: it goes. `readableUrl` keeps the host and a shortened path, which
        //: is what a browser's own address bar shows, and the full address
        //: stays one hover (and the click) away.
        a.title = bareUrl;
        highlightInto(a, readableUrl(bareUrl), terms);
        element.appendChild(a);
      } else {
        const span = document.createElement("span");
        highlightInto(span, bareUrl, terms);
        element.appendChild(span);
      }
      cursor = pattern.lastIndex;
      continue;
    }
    const tag = code
      ? "code"
      : bold
        ? "strong"
        : strike
          ? strikeTag
          : mark
            ? "mark"
            : ink
              ? "span"
              : "em";
    const node = document.createElement(tag);
    // Distinguishes a `==highlight==` from highlightInto's own <mark> below
    // (used for search-term matches), same tag, different meaning, so they
    // need different styling or a highlighted note reads as "this matched
    // your search" with no search active.
    // `++red|text++`, a foreground colour, the counterpart to the highlight's
    // background one. The colour is part of a class name, never an inline
    // style: this app's CSP rejects inline styles outright (a whole batch of
    // them was found doing nothing once), and a closed allowlist means every
    // colour that can be typed has a theme-aware rule written for it.
    if (ink) node.className = `text-ink text-ink-${inkColour}`;
    if (mark) {
      // `==text==` is the plain (yellow) highlight; `==green|text==` picks one
      // of a small named set. An allowlist baked into the pattern itself, not
      // a free-form colour: the value lands in a class name, and every colour
      // that can appear here therefore has a stylesheet rule written for it
      // (05-sidebars-themes.css) that is theme-aware in both light and dark.
      node.className = markColour
        ? `text-highlight text-highlight-${markColour}`
        : "text-highlight";
    }
    // A code span is literal by definition, so it is never searched-highlighted
    // into pieces: the rest still is, or filtering would stop marking any
    // word that happened to sit inside emphasis.
    if (code) node.textContent = code;
    else highlightInto(node, bold || strike || mark || ink || italic, terms);
    element.appendChild(node);
    cursor = pattern.lastIndex;
  }
  if (cursor < text.length) {
    const rest = text.slice(cursor);
    if (underscoreSyntax) {
      element.appendChild(document.createTextNode(rest));
    } else {
      const restSpan = document.createElement("span");
      highlightInto(restSpan, rest, terms);
      element.appendChild(restSpan);
    }
  }
}

// Inline formatting: **bold**/__bold__, *italic*/_italic_, `code`, ~~strike~~,
// ==highlight==, [text](http…url), images, and bare http(s) URLs. Built with textContent
// only: note/answer text can never inject markup. Was its own ~90-line
// hand-rolled parser with its own `isRenderableUrl` gate call; now a thin
// wrapper over renderInlineMarkdown (ROADMAP.md §0/§2): see that function's
// `options` comment for exactly which behaviours these five overrides
// reproduce and why each one is there.
function appendInline(parent, text) {
  renderInlineMarkdown(parent, text, [], false, {
    dismissible: false,
    autolinkBareUrls: true,
    underscoreSyntax: true,
    // `.answer del`/`.bubble-answer del`/`.dash-body del` (style.css) style
    // this tag specifically: appendInline's own callers always used <del>,
    // not the note-card renderer's <s>, and the CSS was written for that.
    strikeTag: "del",
    applyLatex: false,
  });
}

// Mirrors manager.extract_title's own rule (the first non-blank line, and
// only that line) so the body shown under a title never repeats it, called
// only when the backend has already said this note has a title, so this
// never has to decide on its own whether a line "looks like" a heading.
function bodyWithoutTitleLine(content) {
  const lines = content.split("\n");
  let i = 0;
  while (i < lines.length && lines[i].trim() === "") i++;
  if (i >= lines.length) return content;
  lines.splice(i, 1);
  if (lines[i] !== undefined && lines[i].trim() === "") lines.splice(i, 1);
  return lines.join("\n");
}

// The note a [[wiki link]] names, or null.
//
// One resolver, because there were two: renderNoteText matched notes by the
// opening words and layerDocWikiLinks matched documents by exact title, so the
// same [[name]] meant different things depending on which pane rendered it.
// Notes are matched first and by prefix (that is what applyWikiSuggestion
// inserts: a note's opening words); documents fall back to an exact,
// case-insensitive title. Private notes are never a target: they cannot be
// linked, and resolving to one would leak that it exists.
//: **The lowercased forms a wiki lookup compares against, computed once per
//: note rather than once per note per link.**
//:
//: `resolveWikiTarget` runs for every `[[link]]` that renders, and it used to
//: lowercase every note's whole body, twice (once plain, once with the
//: heading marker stripped by a regex), on every one of those calls. At four
//: thousand notes averaging 594 bytes that is up to 4.8 MB of string work per
//: link, and a note list draws sixty cards at a time. Profiled over fourteen
//: seconds of ordinary use, `opening` and `openingTitle` and their caller
//: came to 267 ms of self time, more than the dashboard's p5 sketch.
//:
//: Two things fix it and neither can go stale. The forms are cached **on the
//: entry, keyed by the content string they were derived from**, so an edit
//: invalidates them by construction: no generation counter to forget to bump,
//: no cache to clear when `allEntries` is replaced. And only the first
//: `WIKI_PREFIX_MAX` characters are lowercased, because every comparison here
//: is `startsWith` against a needle that is a title. A needle longer than that
//: falls back to the full string, so the bound is an optimisation and never a
//: behaviour.
const WIKI_PREFIX_MAX = 300;

function wikiForms(entry, needleLength) {
  const content = entry.content || "";
  if (needleLength > WIKI_PREFIX_MAX) {
    const full = content.toLowerCase();
    return { opening: full, title: full.replace(/^#{1,6}[ \t]*/, "") };
  }
  if (entry._wikiSrc !== content) {
    const head = content.slice(0, WIKI_PREFIX_MAX).toLowerCase();
    entry._wikiSrc = content;
    entry._wikiOpening = head;
    entry._wikiTitle = head.replace(/^#{1,6}[ \t]*/, "");
  }
  return { opening: entry._wikiOpening, title: entry._wikiTitle };
}

//: The same trick for the imported-vault path: a file stem is derived from
//: `source_path` with a split, a pop and a regex, which was also being redone
//: per link per note.
function wikiStem(entry) {
  const path = entry.source_path || "";
  if (entry._wikiStemSrc !== path) {
    entry._wikiStemSrc = path;
    entry._wikiStem = path.split("/").pop().replace(/\.(md|markdown)$/i, "").toLowerCase();
  }
  return entry._wikiStem;
}

//: **A board or a map named by its id**, the form the "/" menu and the
//: board's own "Add to a note" write: `board:12|House jobs`, or `map:12|The
//: house`.
//:
//: Why an id rather than the title every other `[[link]]` uses (INBOX 309,
//: the owner: "there is also no way to attach a whiteboard or mindmap to a
//: note as like an object in the notes"). A title-addressed object breaks the
//: moment the board is renamed, and it breaks *silently*: a renamed board and
//: a deleted one look identical to the resolver, so the note either points at
//: nothing or tombstones a board that is still there. A board is an `Entry`,
//: so its id is stable, and renaming it now leaves every note that carries it
//: pointing at the same board.
//:
//: **The title travels with the id anyway**, for two reasons that are not
//: decoration. It is what a tombstone says when the board really is gone
//: ("Old plan" beats "board 12"), and it is what the backend's own reference
//: scan matches on: `_reference_rows` in routes_entries.py finds a board's
//: references with a LIKE over note content for the board's label, so a note
//: carrying the title still counts towards the card's "on 1 board" chip with
//: no backend change at all.
//:
//: `whiteboard` and `mindmap` are accepted as spellings of the same two
//: things because somebody typing this by hand will write one of them.
const BOARD_REF_PATTERN = /^\s*(board|whiteboard|map|mindmap)\s*:\s*(\d{1,9})\s*(?:\|\s*([^|]*))?$/i;

function boardEmbedRef(name) {
  const match = BOARD_REF_PATTERN.exec(String(name || ""));
  if (!match) return null;
  return {
    id: Number(match[2]),
    title: (match[3] || "").trim(),
    //: What the writer *said* it was, used only until the board itself is
    //: found: the board's own `type` is the truth, and a map turned into a
    //: whiteboard after the note was written should draw as a whiteboard.
    map: /map/i.test(match[1]),
  };
}

//: The board a reference points at, or null when it is really gone.
//:
//: Two lookups, in this order. The id is exact and is what the writer meant.
//: The title is the fallback for the one case an id cannot survive: a board
//: exported and imported again, or restored from a backup, keeps its name and
//: takes a new id. Trying it before calling anything missing is the difference
//: between a tombstone that is right and one that is merely early.
function boardEmbedTarget(ref) {
  if (!ref || !ref.id) return null;
  const byId = typeof mapBoardById === "function" ? mapBoardById(ref.id) : null;
  if (byId) return byId;
  if (!ref.title || typeof mapBoardTitled !== "function") return null;
  return mapBoardTitled(ref.title.toLowerCase());
}

function resolveWikiTarget(name) {
  //: An id-addressed board is answered before anything is lower-cased or
  //: scanned: it names exactly one thing, and the notes-then-documents walk
  //: below could only ever find something else called "board:12".
  const ref = boardEmbedRef(name);
  if (ref) {
    const board = boardEmbedTarget(ref);
    return board ? { kind: "board", entry: board } : null;
  }
  const needle = String(name || "").trim().toLowerCase();
  if (!needle) return null;
  const entries = typeof allEntries !== "undefined" ? allEntries : [];
  //: **A vault's links name the file.** An imported note carries the path it
  //: came from, and Obsidian writes `[[Roadmap]]` for `Projects/Roadmap.md`, 
  //: so this is tried first, and matched exactly: a file called "Index"
  //: should not lose to a note that merely opens with the word "index". Same
  //: rule as `find_by_wiki_name` in entry/manager.py, which is what makes the
  //: link the backend stores and the link this pane draws point at one note.
  const vaultNote = entries.find(
    (e) => !e.is_private && e.source_path && wikiStem(e) === needle
  );
  if (vaultNote) return { kind: "note", entry: vaultNote };
  //: **A board is a link target, and it is not a note.** MINDMAP_PLAN.md §5
  //: item 12 asks for a map chip in note bodies, and the `@`/`[[` picker in
  //: editor.js has offered boards as targets since it was written, so the
  //: link could already be *typed* and resolved to something. What it resolved
  //: to was `{kind: "note"}`, and the click called `flashEntry`, which scrolls
  //: the Notes tab to a row that is not there: a board is filtered out of
  //: every note list in the app. So the link worked, looked like a note, and
  //: went nowhere.
  //:
  //: Matched on the board's *title* with the `# ` stripped, and by prefix on
  //: the raw content underneath, because both forms exist in real notes: the
  //: picker used to insert the whole first line (`[[# My map]]`) and now
  //: inserts the title (`[[My map]]`).
  //:
  //: **Read from the board index, not from `allEntries`.** `GET /entries` is
  //: the notes list and no longer carries boards at all (see its `boards`
  //: parameter, a map called "test" was showing up as a note, reported), so
  //: this used to resolve against a list that will not have the board in it.
  //: `mapBoardIndexCache` is `/whiteboard/boards`, which is the list of
  //: boards by definition, and it is already loaded for the map chips.
  const board = mapBoardTitled(needle);
  if (board) return { kind: "board", entry: board };
  //: **Two ways a note's opening words can be written, and both resolve.** The
  //: `[[` picker inserts the note's first line *verbatim*, `# ` and all, so
  //: matching the content by prefix is what makes `[[# Girl with bell]]`
  //: resolve. Anybody typing a link by hand writes the title they can see,
  //: `[[Girl with bell]]`, and that matched nothing at all: the note's content
  //: starts with the hash, so the prefix test failed on the first character.
  //: Reported by the agent that built the document embeds, which had to avoid
  //: the shape in its own fixture.
  //:
  //: The second comparison strips a leading heading marker from the *content*
  //: rather than adding one to the needle, because the marker is one to six
  //: hashes and any amount of space, and the content is where that is known.
  //: One pass, not a `filter` into a four thousand entry array followed by
  //: two `find`s over it. The plain-opening match still wins over the
  //: marker-stripped one, which is what the two passes were for: it is
  //: remembered rather than searched for twice.
  let note = null;
  let titleMatch = null;
  for (const entry of entries) {
    if (entry.is_private || entry.is_board) continue;
    const forms = wikiForms(entry, needle.length);
    if (forms.opening.startsWith(needle)) {
      note = entry;
      break;
    }
    if (!titleMatch && forms.title.startsWith(needle)) titleMatch = entry;
  }
  note = note || titleMatch;
  if (note) return { kind: "note", entry: note };
  //: **The document list the documents editor holds, when this one is
  //: empty.** `editorDocumentCache` is filled only once the `[[` picker has
  //: been opened, so until then every `![[A document]]` in the Read view said
  //: "Nothing called A document yet" while the Live view of the same line,
  //: which resolves through documents.js's own `docs`, drew it: two views of
  //: one line disagreeing (found by `scratchpad/ui-sweeps/blockbar.js`).
  const cached = typeof editorDocumentCache !== "undefined" && editorDocumentCache && editorDocumentCache.length
    ? editorDocumentCache
    : null;
  const documents = cached || (typeof docs !== "undefined" && Array.isArray(docs) ? docs : null);
  const docList = documents || [];
  const doc =
    docList.find((d) => (d.title || "").trim().toLowerCase() === needle) ||
    //: Reported directly: "still cant open note links from the document
    //: editor", on a link whose visible text ended mid-word ("...and
    //: progr"). Exact match only fails both plausible causes of that: a
    //: shorter string was written into the `[[...]]` than the document's
    //: current title (however that happened), or the document was
    //: retitled after the link was made. A prefix match is the same
    //: fallback `note` above already gets for exactly the same reason,
    //: and a link that is a genuine prefix of a longer title is a much
    //: likelier accident than two documents sharing one.
    docList.find((d) => (d.title || "").trim().toLowerCase().startsWith(needle));
  if (doc) return { kind: "document", doc };
  return null;
}

// A note card's text: block constructs first, then the inline pass.
//
// Notes deliberately do not go through renderMarkdown, this pass keeps
// search-term highlighting, which that renderer has no concept of. So the two
// block constructs the "/" menu can insert are handled here explicitly and
// everything else falls through to exactly the inline rendering this function
// always did. When a note contains neither, the DOM produced is identical to
// before, which is why the fall-through appends to `element` directly rather
// than wrapping runs in a container.
function renderNoteText(element, text, terms) {
  element.replaceChildren();
  const lines = String(text ?? "").replace(/\r\n/g, "\n").split("\n");
  let buffer = [];
  const flush = () => {
    if (!buffer.length) return;
    renderNoteInline(element, buffer.join("\n"), terms);
    buffer = [];
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    const embedded = line.match(/^\s*!\[\[([^[\]]{1,120})\]\]\s*$/);
    if (embedded) {
      flush();
      element.appendChild(mdEmbedElement(embedded[1].trim(), 0));
      i++;
      continue;
    }

    //: The structural blocks the "/" menu writes (INBOX 421 b: they had to
    //: work "in documents and notes"), through the same builders the page
    //: renderer uses. A column is rendered by this function, so it keeps the
    //: card's search highlighting.
    const columns = mdColumnsFrom(lines, i);
    if (columns) {
      flush();
      element.appendChild(mdColumnsElement(columns.columns, (host, body) => renderNoteText(host, body, terms)));
      i = columns.end;
      continue;
    }
    const maths = mdMathBlockFrom(lines, i);
    if (maths) {
      flush();
      element.appendChild(mdMathElement(maths.tex));
      i = maths.end;
      continue;
    }
    const rule = mdDividerKind(line);
    if (rule) {
      flush();
      element.appendChild(mdRuleElement(rule));
      i++;
      continue;
    }
    //: A card's headings are not elements to jump to (the card is one
    //: paragraph of text), so its contents block is the outline itself: the
    //: note's headings, indented by level, as a list to read.
    if (MD_TOC_LINE.test(line)) {
      flush();
      const toc = mdTocElement();
      const list = toc.querySelector(".md-toc-list");
      const entries = mdTocEntries(lines.join("\n"));
      const top = entries.length ? Math.min(...entries.map((e) => e.level)) : 1;
      for (const entry of entries) {
        const item = document.createElement("li");
        item.className = `md-toc-item md-toc-depth-${Math.min(3, entry.level - top)}`;
        renderInlineMarkdown(item, entry.text, terms);
        list.appendChild(item);
      }
      if (!entries.length) {
        const empty = document.createElement("li");
        empty.className = "md-toc-empty";
        empty.textContent = "Headings you add appear here.";
        list.appendChild(empty);
      }
      element.appendChild(toc);
      i++;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const quoted = [];
      let j = i;
      while (j < lines.length && /^\s*>\s?/.test(lines[j])) {
        quoted.push(lines[j].replace(/^\s*>\s?/, ""));
        j++;
      }
      const box = mdCalloutElement(quoted, 0);
      if (box) {
        flush();
        element.appendChild(box);
        i = j;
        continue;
      }
      // An ordinary blockquote, not a callout: leave it to the inline pass
      // exactly as it was written, rather than eating the "> " markers.
    }

    buffer.push(line);
    i++;
  }
  flush();
}

// The inline half: [[wiki links]], emphasis, and search-term highlighting.
// Appends to `parent`; does not clear it.
function renderNoteInline(element, text, terms) {
  const pattern = /\[\[([^[\]]{1,120})\]\]/g;
  let cursor = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      const span = document.createElement("span");
      renderInlineMarkdown(span, text.slice(cursor, match.index), terms);
      element.appendChild(span);
    }
    const name = match[1].trim();
    //: **A link that names a map draws as a map chip** (MINDMAP_PLAN.md §5
    //: item 12: "note bodies"). Resolved here rather than on click, which is
    //: what every other kind still does, because the *shape* of the control
    //: depends on the answer: a chip carries the map's icon and node count,
    //: and neither can be decided after the element is already on screen.
    //: One `find` over `allEntries` per wiki link, on a list that is already
    //: in memory: the same lookup the click handler was doing anyway.
    const mapTarget = resolveWikiTarget(name);
    if (mapTarget && mapTarget.kind === "board") {
      const board = mapBoardById(mapTarget.entry.id) || {
        id: mapTarget.entry.id,
        title: name,
        type: "map",
      };
      element.appendChild(mapChip(board));
      cursor = pattern.lastIndex;
      continue;
    }
    const link = document.createElement("button");
    link.type = "button";
    link.className = "wiki-link";
    const label = wikiLinkLabel(name);
    link.textContent = label;
    link.title = `Go to the note starting "${label}"`;
    link.addEventListener("click", (event) => {
      event.stopPropagation();
      const target = resolveWikiTarget(name);
      if (target && target.kind === "note") flashEntry(target.entry.id);
      else if (target && target.kind === "board") openWhiteboardBoard(target.entry.id);
      else if (target && target.kind === "document") openDocument(target.doc.id);
      // Nothing by that name yet, offer to make it rather than dead-ending.
      // A link you typed on purpose is the clearest possible statement that
      // the thing should exist; making the user go and create it by hand, then
      // come back, is the friction this removes.
      else offerToCreateWikiTarget(name);
    });
    element.appendChild(link);
    cursor = pattern.lastIndex;
  }
  if (cursor < text.length) {
    const span = document.createElement("span");
    renderInlineMarkdown(span, text.slice(cursor), terms);
    element.appendChild(span);
  }
}

//: `terms` is "the words to highlight", and **every caller that has nothing to
//: highlight passes something falsy rather than `[]`**, `chatSourcesPanel`
//: passes a literal `null`, which is what a snippet with no search behind it
//: honestly is. This read `terms.length` directly and threw
//: `Cannot read properties of null (reading 'length')`.
//:
//: The throw is worth recording because of where it landed rather than what it
//: was. `renderInlineMarkdown` is called while a saved conversation's Sources
//: panel is being built, which happens inside `openConversation`, so the
//: exception aborted the rest of that function, including the
//: `loadConversationList()` at its end that repaints the sidebar. Reported as
//: "I clicked on other chat conversations in the chat sidebar but the
//: conversations didnt visibly select in the sidebar": the click worked, the
//: fetch worked, and an unrelated null check three calls down stopped the row
//: from ever being marked. Nothing was logged where anyone would look.
//:
//: Normalised here, at the one place that reads it, rather than at each call
//: site: the next caller to pass `null` should not have to know either.
function highlightInto(element, text, terms) {
  element.replaceChildren();
  if (!terms || !terms.length) {
    element.textContent = text;
    return;
  }
  // One pass, longest terms first so "bread rolls" wins over "bread".
  const ordered = [...terms].sort((a, b) => b.length - a.length);
  const lower = text.toLowerCase();
  let cursor = 0;
  while (cursor < text.length) {
    let bestAt = -1;
    let bestTerm = "";
    for (const term of ordered) {
      const at = lower.indexOf(term, cursor);
      if (at !== -1 && (bestAt === -1 || at < bestAt)) {
        bestAt = at;
        bestTerm = term;
      }
    }
    if (bestAt === -1) {
      element.appendChild(document.createTextNode(text.slice(cursor)));
      return;
    }
    if (bestAt > cursor) {
      element.appendChild(document.createTextNode(text.slice(cursor, bestAt)));
    }
    const mark = document.createElement("mark");
    mark.textContent = text.slice(bestAt, bestAt + bestTerm.length);
    element.appendChild(mark);
    cursor = bestAt + bestTerm.length;
  }
}

// The words worth highlighting in a result, operators aren't text to find.
function searchHighlightTerms() {
  if (!noteSearch) return [];
  const query = parseNoteQuery(noteSearch);
  return [...query.phrases, ...query.words].filter((t) => t.length > 1);
}

// "Why this result", in words rather than a number, from the three scores the
// engine returns with every hit (`search/engine.py`). Asked for by Brief 11
// directly: the list says *matched the title*, *similar meaning*, *linked to
// the open note*, and the exact percentages sit in the tooltip for anyone who
// disagrees with the order. The chip recipe is the one the chat results
// already use (`.chip.result-reason-chip`), not a new look.
function whyThisResultChip(entry) {
  const hit = noteSearchWhy.get(entry.id);
  const words = hit?.explain?.join(" · ");
  if (!words) return null;
  const badge = chip(`ph:sparkle ${words}`, "result-reason-chip result-reason-why");
  const percent = (value) => Math.round((value || 0) * 100);
  badge.title =
    `Why this result: words ${percent(hit.scores?.bm25)}%, ` +
    `meaning ${percent(hit.scores?.cosine)}%, ` +
    `links ${percent(hit.scores?.graph)}%.`;
  return badge;
}

// One call per settled query, not per keystroke: the caller debounces, and a
// reply that arrives after the box has moved on is dropped rather than
// painting reasons for a query nobody is looking at any more.
async function refreshNoteSearchWhy() {
  const asked = noteSearch;
  if (!asked) {
    noteSearchWhy.clear();
    return;
  }
  // What the person is looking at, when that is unambiguous: one note opened
  // out in the list is the app's own "open note", and it is what makes the
  // third signal (distance over the links) mean anything. Two open rows, or
  // none, is not a context, and passing a guess would put "linked to the open
  // note" on a note linked to something nobody is reading.
  const open =
    editingId || (expandedRows.size === 1 ? [...expandedRows][0] : null);
  let body;
  try {
    // 50 is the endpoint's own ceiling (`routes_search.MAX_LIMIT`): a search
    // box shows a page, not a notebook, and a note past the fiftieth best
    // match simply carries no reason chip rather than a wrong one.
    body = await apiJson(
      `/search?q=${encodeURIComponent(asked)}&kind=note,board,map&limit=50` +
        (open ? `&entry_id=${open}` : "")
    );
  } catch {
    // The list is already rendered and already correct; the reasons are the
    // only thing missing, so a failed call leaves the notes alone.
    return;
  }
  if (noteSearch !== asked) return;
  noteSearchWhy.clear();
  for (const hit of body?.hits || []) noteSearchWhy.set(hit.id, hit);
  renderEntries();
}

// Sort comparator for the chosen mode (Wave J). Pinned always floats to
// the top first, matching the server's own ordering.
function sortEntries(entries) {
  const byPinned = (a, b) => Number(b.pinned) - Number(a.pinned);
  const modes = {
    newest: (a, b) => b.id - a.id,
    oldest: (a, b) => a.id - b.id,
    az: (a, b) => a.content.localeCompare(b.content),
    "most-used": (a, b) => b.access_count - a.access_count || b.id - a.id,
    //: The server's own fading order, by position rather than by a score
    //: recomputed here: `ai/resurface.py` weighs age, links and opens, and a
    //: second copy of those weights in the browser is the two-answers shape
    //: this app has paid for before. A note the ranking has not reached (it
    //: is capped, and a dismissed note is not in it) sorts after every note
    //: that is in it, rather than jumping to the top on a missing key.
    forgotten: (a, b) => {
      const far = forgottenOrder.size + 1;
      return (forgottenOrder.get(a.id) ?? far) - (forgottenOrder.get(b.id) ?? far) || b.id - a.id;
    },
  };
  const cmp = modes[noteSort] || modes.newest;
  return [...entries].sort((a, b) => byPinned(a, b) || cmp(a, b));
}

// --- incremental list rendering (ROADMAP §85.4 items 3 and 4) ---------------
//
// **The problem this solves, measured rather than assumed.** Four of this
// app's lists: the Notes list, the Library grid, the Timeline, the log
// console: built one DOM node per record for the *entire* collection, with
// no cap and no windowing. At 1,501 notes `renderEntries()` took ~533ms, and
// it re-runs on every search keystroke, sort change, filter and save.
//
// **Why chunk-on-scroll rather than true virtualisation.** Real
// virtualisation (absolute positioning against a scroll offset) needs to know
// each row's height before it renders one. Every list here has variable
// heights: a note card grows with its text, its tags, its attachments and
// whether its inline actions are open, so a virtualiser would either need
// measurement passes that cost what it saves, or fixed heights the design
// does not have. Rendering in chunks as the end of the list approaches keeps
// the DOM proportional to what has been *scrolled past* rather than to the
// notebook, needs no height information at all, and leaves the list one
// continuous scroll rather than turning it into pages, which is the
// distinction BACKLOG §77 draws and deliberately asks for.
//
// **The honest trade:** the browser's own Ctrl+F cannot find text in a chunk
// that has not rendered yet. That is a real loss, and it is why `initial` is
// generous rather than minimal, a screenful and change is always present , 
// and why it is applied to lists that have their own search box sitting
// directly above them. It is not applied anywhere that the browser's find is
// the only way through.
//
// `root: null` (the viewport) rather than the scroll container: an element
// inside the scrolled-away part of a *nested* scroller is not intersecting
// the viewport either, so one observer is correct for both a page-level and a
// container-level scroll, without having to find which one this list is in.
const listWindows = new WeakMap();

function renderIncrementally(container, items, buildItem, options = {}) {
  const { initial = 60, chunk = 40, afterChunk } = options;

  // Tear down the previous run first. Without this a re-render (a keystroke in
  // the search box) leaves the old observer alive, still holding the old
  // items, still appending them into a container that has moved on, the
  // "listener added without removal" shape, and the reason this is a
  // WeakMap rather than a local.
  listWindows.get(container)?.disconnect();
  listWindows.delete(container);

  const paint = (from, to) => {
    const fragment = document.createDocumentFragment();
    for (let i = from; i < to; i++) fragment.appendChild(buildItem(items[i], i));
    container.appendChild(fragment);
  };

  paint(0, Math.min(initial, items.length));
  afterChunk?.();
  if (items.length <= initial) return;

  let rendered = initial;
  // A zero-height marker after the last painted item. It is the *list's* own
  // last child rather than a sibling of the container, so it moves down as
  // chunks land and it inherits whatever scroller the list is in.
  const sentinel = document.createElement("li");
  sentinel.className = "list-window-sentinel";
  sentinel.setAttribute("aria-hidden", "true");
  container.appendChild(sentinel);

  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      const next = Math.min(rendered + chunk, items.length);
      // Insert *before* the sentinel so it stays last and keeps observing.
      const fragment = document.createDocumentFragment();
      for (let i = rendered; i < next; i++) fragment.appendChild(buildItem(items[i], i));
      container.insertBefore(fragment, sentinel);
      rendered = next;
      afterChunk?.();
      if (rendered >= items.length) {
        observer.disconnect();
        listWindows.delete(container);
        sentinel.remove();
      }
    },
    // Start the next chunk while the sentinel is still a screen away, so the
    // list refills before the user reaches the bottom rather than after.
    { root: null, rootMargin: "600px 0px" }
  );
  observer.observe(sentinel);
  listWindows.set(container, observer);
}

// BACKLOG §77 item 1, the user-facing page-size control, deliberately kept
// separate from §86's scroll-chunking (renderIncrementally above): that stays
// one continuous scroll under "All notes" (the default, and this function's
// no-op path). A numeric size instead slices whatever list renderEntries was
// about to paint down to one page and updates the Prev/Next bar.
//
// Threads are the one place this is a known, accepted simplification: a
// thread and its children can, at a page boundary, split across two pages
// (part 2 of §77, routing a wiki-link click to the *right* page, depends
// on sort/filter state and is scoped separately, not solved here).
function paginateNotesForDisplay(items) {
  const bar = $("notes-pagination");
  if (notesPageSize === "all") {
    bar.classList.add("hidden");
    return items;
  }
  const pageSize = Number(notesPageSize);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  notesCurrentPage = Math.min(Math.max(1, notesCurrentPage), totalPages);
  const start = (notesCurrentPage - 1) * pageSize;
  bar.classList.toggle("hidden", items.length === 0);
  $("notes-page-status").textContent = `Page ${notesCurrentPage} of ${totalPages}`;
  $("notes-page-prev").disabled = notesCurrentPage <= 1;
  $("notes-page-next").disabled = notesCurrentPage >= totalPages;
  return items.slice(start, start + pageSize);
}

// **The exact order the Notes list would paint, computed without painting
// it.** Split out of `renderEntries` (BACKLOG §77 item 2, routing a
// wiki-link click to the right *page*) so there is exactly one place that
// decides "what order do these notes render in", used both to actually
// render them and to answer "which page would note N land on" before a
// jump. Threads are the reason this can't be a plain sort-then-slice: a
// child's position depends on its parent's position, not on the child's own
// sort key, so `renderEntries`'s own thread-flattening (`ordered`,
// `addWithChildren`) is reproduced here rather than approximated.
//
// Reads the same module-level filter state `renderEntries` does
// (`draftsOnly`, `activeCategory`, `noteSearch`, `noteSort`), a caller that
// wants a *different* view's ordering (see `resolveNotePage` below) sets
// those first, the same way `flashEntry` already resets category/search/
// drafts before it ever draws anything.
function orderedNotesForCurrentView() {
  let visible = draftsOnly
    ? allEntries.filter((e) => e.is_draft)
    : favouritesOnly
      ? allEntries.filter((e) => e.pinned && !e.is_draft)
      : activeCategory
        ? allEntries.filter((e) => e.category === activeCategory && !e.is_draft)
        : allEntries.filter((e) => !e.is_draft);
  visible = visible.filter(matchesSearch);

  const flat = Boolean(noteSearch) || noteSort !== "newest";
  if (flat) return sortEntries(visible).map((entry) => [entry, 0]);

  const visibleIds = new Set(visible.map((e) => e.id));
  const childrenOf = new Map();
  for (const entry of visible) {
    if (entry.parent_id && visibleIds.has(entry.parent_id)) {
      if (!childrenOf.has(entry.parent_id)) childrenOf.set(entry.parent_id, []);
      childrenOf.get(entry.parent_id).push(entry);
    }
  }
  const ordered = [];
  const addWithChildren = (entry, depth) => {
    ordered.push([entry, depth]);
    const children = (childrenOf.get(entry.id) || []).slice().reverse();
    for (const child of children) addWithChildren(child, depth + 1);
  };
  for (const entry of visible) {
    const parentVisible = entry.parent_id && visibleIds.has(entry.parent_id);
    if (!parentVisible) addWithChildren(entry, 0);
  }
  return ordered;
}

// Which page (1-based) a note lands on in the Notes list's *current*
// filter/sort: the arithmetic half of BACKLOG §77 item 2. "All notes" (no
// pagination) always answers page 1, since there is only one. Returns null
// for a note the current filters would hide entirely (a category filter
// excluding it, say): a page number for a note that isn't in the list
// would be a lie, not an answer.
function resolveNotePage(id) {
  if (notesPageSize === "all") return 1;
  const order = orderedNotesForCurrentView();
  const index = order.findIndex(([entry]) => entry.id === id);
  if (index === -1) return null;
  return Math.floor(index / Number(notesPageSize)) + 1;
}

//: Rows or cards.
//:
//: **Cards is the default, by direct instruction**, "maybe make the cards
//: notes view default", after rows shipped as the default first. Rows
//: exist because a two-line note was a 111px card plus a 10px gap, so a
//: 900px window showed five notes; they fit twelve. But density is not the
//: only thing a list of notes is for, and a card shows the note rather than
//: a clipped line of it. Both are one click apart, and a row expands in
//: place (see `row-expanded` below), so the compact view is no longer a
//: view that *withholds* things.
//:
//: **The choice is remembered**, also asked for directly. localStorage
//: rather than a server preference: it is a property of this screen on this
//: machine, the same family as the expanded/collapsed sets above, and a
//: round trip to change how a list looks would be the wrong trade. Read as
//: "rows only if rows was explicitly chosen", so a profile that has never
//: touched the toggle gets cards.
let notesViewMode = localStorage.getItem("notesViewMode") === "rows" ? "rows" : "cards";

function applyNotesViewMode() {
  const list = $("entry-list");
  if (list) list.classList.toggle("is-rows", notesViewMode === "rows");
  $("notes-view-rows")?.classList.toggle("active", notesViewMode === "rows");
  $("notes-view-cards")?.classList.toggle("active", notesViewMode === "cards");
  $("notes-view-rows")?.setAttribute("aria-pressed", String(notesViewMode === "rows"));
  $("notes-view-cards")?.setAttribute("aria-pressed", String(notesViewMode === "cards"));
  updateExpandAllButton();
}

//: **Expand / collapse every row in the list you are looking at.** Asked for
//: directly ("on the collapsed note view mode there should be an expand
//: and/or collapse all button"). One button rather than two, because the
//: only two states it can be in each have exactly one useful next move.
//:
//: It reads the rendered `<li>`s rather than recomputing which notes are
//: visible. Filtering, sorting, threading and pagination all decide that
//: between them, and a second implementation of "which notes are on screen"
//: is a second thing to keep in step, the DOM already holds the answer.
function listedNoteIds() {
  return [...document.querySelectorAll("#entry-list > li[data-id]")].map((li) =>
    Number(li.dataset.id)
  );
}

function updateExpandAllButton() {
  const button = $("notes-expand-all");
  if (!button) return;
  // Cards view opens every note by definition, so the control would say
  // nothing there.
  button.classList.toggle("hidden", notesViewMode !== "rows");
  if (notesViewMode !== "rows") return;
  const ids = listedNoteIds();
  const anyCollapsed = ids.some((id) => !expandedRows.has(id));
  setLabel(
    button,
    anyCollapsed ? "ph:arrows-out-line-vertical Expand all" : "ph:arrows-in-line-vertical Collapse all"
  );
  button.title = anyCollapsed
    ? "Open every note in this list"
    : "Close every note back to a single line";
  button.setAttribute("aria-label", button.title);
  button.disabled = ids.length === 0;
}

function toggleExpandAllRows() {
  const ids = listedNoteIds();
  if (!ids.length) return;
  const anyCollapsed = ids.some((id) => !expandedRows.has(id));
  for (const id of ids) {
    if (anyCollapsed) expandedRows.add(id);
    else expandedRows.delete(id);
  }
  renderEntries();
}

function setNotesViewMode(mode) {
  notesViewMode = mode === "cards" ? "cards" : "rows";
  localStorage.setItem("notesViewMode", notesViewMode);
  applyNotesViewMode();
}

//: Which rows the reader has opened out. Asked for directly: "I think the
//: compact cards need to be expandable to show all the note details and
//: features."
//:
//: A row is a summary, it clips the body to one line and hides images, file
//: cards and link chips, which is what makes twelve of them fit. That is the
//: right default and the wrong dead end: wanting to *see* one of them should
//: not mean switching the whole list to cards and losing your place. An
//: expanded row drops back to the full card layout in place, so one note can
//: be open inside an otherwise compact list.
//:
//: Not persisted, deliberately. It is a reading position, not a preference, 
//: coming back to a list with six notes arbitrarily open would be worse than
//: coming back to a tidy one.
const expandedRows = new Set();

function toggleRowExpanded(id) {
  if (expandedRows.has(id)) expandedRows.delete(id);
  else expandedRows.add(id);
  renderEntries();
}

$("notes-expand-all")?.addEventListener("click", toggleExpandAllRows);
$("notes-view-rows")?.addEventListener("click", () => setNotesViewMode("rows"));
$("notes-view-cards")?.addEventListener("click", () => setNotesViewMode("cards"));

function noteCountExcludingDrafts() {
  let n = 0;
  for (const e of allEntries) if (!e.is_draft) n += 1;
  return n;
}

function libraryVisibleRows() {
  let visible = draftsOnly
    ? allEntries.filter((e) => e.is_draft)
    : favouritesOnly
      ? allEntries.filter((e) => e.pinned && !e.is_draft)
      : activeCategory
        ? allEntries.filter((e) => e.category === activeCategory && !e.is_draft)
        : allEntries.filter((e) => !e.is_draft);
  return visible.filter(matchesSearch);
}

function renderEntries() {
  closeNotePageIfGone();
  // A cleared box clears its reasons here rather than at each of the five
  // places that can clear the box: a reason for a query nobody typed is
  // worse than no reason at all.
  if (!noteSearch && noteSearchWhy.size) noteSearchWhy.clear();
  const list = $("entry-list");
  const empty = $("empty-message");
  const noMatch = $("no-match-message");
  list.replaceChildren();
  // Re-applied on every render, not just on a click: `replaceChildren`
  // above leaves the class alone, but a later render that rebuilt the <ul>
  // itself would not: and this failing silently would look like the
  // toggle not working rather than a class being dropped.
  applyNotesViewMode();

  // Drafts stay out of All/category views entirely, user-reported: they
  // should only show up in the Drafts filter until saved as a real note.
  const visible = libraryVisibleRows();

  // "Notes" everywhere else on this tab ("Your notes", "notebook", the
  // status-bar note count): this heading used to say "entries" (the API's
  // internal name, /entries), the one place on the tab that didn't match
  // (Part C terminology audit).
  const scope = draftsOnly
    ? "Drafts"
    : favouritesOnly
      ? "Favourites"
      : activeCategory
        ? `${activeCategory} notes`
        : "All notes";
  // Say how many matched out of how many there are. Without it a filter that
  // hides most of the notebook looks identical to a notebook that's nearly
  // empty, and there's no signal that a filter is even active.
  const total = draftsOnly
    ? allEntries.filter((e) => e.is_draft).length
    : favouritesOnly
      ? allEntries.filter((e) => e.pinned && !e.is_draft).length
      : activeCategory
        ? allEntries.filter((e) => e.category === activeCategory && !e.is_draft).length
        : allEntries.filter((e) => !e.is_draft).length;
  $("entries-heading-label").textContent =
    noteSearch && visible.length !== total
      ? `${scope}: ${visible.length} of ${total}`
      : scope;
  // Distinguish "empty notebook" from "filter matched nothing".
  const notebookEmpty = allEntries.length === 0;
  empty.classList.toggle("hidden", !notebookEmpty);
  noMatch.classList.toggle("hidden", notebookEmpty || visible.length > 0);

  // A search or a non-default sort means the user wants a flat, ordered
  // list: thread nesting only applies to the default newest view.
  const flat = Boolean(noteSearch) || noteSort !== "newest";
  if (flat) {
    renderIncrementally(
      list,
      paginateNotesForDisplay(sortEntries(visible)),
      (entry) => entryItem(entry, { actions: true }),
      {
        afterChunk: () => {
          applyEntryListTabOrder(list);
          ensureCardCounts(list, _entriesLoadGeneration);
        },
      }
    );
    return;
  }

  // Threads (Wave B): children render indented under their parent. A
  // child whose parent isn't visible (filtered out) shows at top level.
  const visibleIds = new Set(visible.map((e) => e.id));
  const childrenOf = new Map();
  for (const entry of visible) {
    if (entry.parent_id && visibleIds.has(entry.parent_id)) {
      if (!childrenOf.has(entry.parent_id)) childrenOf.set(entry.parent_id, []);
      childrenOf.get(entry.parent_id).push(entry);
    }
  }

  // Flattened to `[entry, depth]` pairs *before* rendering, rather than
  // recursing straight into the DOM. A thread has to stay whole, a parent and
  // its continuations are one unit and must never be split across a chunk
  // boundary: so the recursion produces the order and the depth, and the
  // renderer below decides how much of that order to paint. Threads are the
  // reason this list cannot simply be sliced: position in `visible` is not
  // position on screen.
  const ordered = [];
  const addWithChildren = (entry, depth) => {
    ordered.push([entry, depth]);
    // Oldest continuation first: a thread reads top to bottom.
    const children = (childrenOf.get(entry.id) || []).slice().reverse();
    for (const child of children) addWithChildren(child, depth + 1);
  };

  for (const entry of visible) {
    const parentVisible = entry.parent_id && visibleIds.has(entry.parent_id);
    if (!parentVisible) addWithChildren(entry, 0);
  }

  renderIncrementally(
    list,
    paginateNotesForDisplay(ordered),
    ([entry, depth]) => {
      const li = entryItem(entry, { actions: true });
      if (depth > 0) {
        li.classList.add("thread-child");
        li.style.marginLeft = `${Math.min(depth, 4) * 1.4}rem`;
      }
      return li;
    },
    {
      afterChunk: () => {
        applyEntryListTabOrder(list);
        ensureCardCounts(list, _entriesLoadGeneration);
        // After the list is in the DOM: drop the clamp from any note that
        // turned out to fit. No-op while the sub-tab is hidden;
        // showNotesSection re-runs it.
        settleNoteClamps();
        // Expand-all reads the rendered rows, and `applyNotesViewMode` runs
        // at the *top* of this function, right after `replaceChildren()`,
        // when the list is empty and the button would read "Expand all
        // (disabled)" forever. Refreshed here, once the rows exist.
        updateExpandAllButton();
      },
    }
  );
}

// --- note-list keyboard navigation (ROADMAP Tier 3 §30a / BACKLOG §16) ------------
// Named directly as "the one interaction pattern used constantly enough that
// its absence would be felt every session, not just noticed in an audit."
// A roving tabindex: only one <li> is ever a Tab stop, so the list is one
// stop in the page's tab order rather than one per note, matching the
// standard listbox/grid keyboard pattern.
// `li[data-id]`, not `list.children`: the incremental renderer parks a
// zero-height sentinel `<li>` at the end of the list to know when to paint the
// next chunk, and it is not a note. Left in `children` it would join the
// roving tabindex and the arrow-key walk below, so ArrowDown at the bottom of
// the list would focus an invisible element and appear to do nothing.
const entryListItems = (list) => Array.from(list.querySelectorAll(":scope > li[data-id]"));

function applyEntryListTabOrder(list) {
  const items = entryListItems(list);
  const current = document.activeElement;
  // Re-renders happen constantly (search-as-you-type, sort, edits): if the
  // previously-focused note is still present, keep it as the one Tab stop
  // instead of silently resetting focus back to the top of the list.
  const keepId = items.some((li) => li === current) ? current.dataset.id : null;
  items.forEach((li) => {
    li.tabIndex = keepId ? (li.dataset.id === keepId ? 0 : -1) : -1;
  });
  if (!keepId && items.length > 0) items[0].tabIndex = 0;
}

function initEntryListKeyboardNav() {
  const list = $("entry-list");
  list.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Enter") return;
    //: A note's own ⋯ menu lives inside its row, so its arrow keys bubble
    //: here too: ArrowDown in the menu moved to the next item and then this
    //: moved the focus out of the menu onto the row (measured, menus.js).
    if (event.target.closest('.action-menu, [role="menu"], [role="listbox"]')) return;
    const items = entryListItems(list);
    const current = event.target.closest("li");
    const index = current ? items.indexOf(current) : -1;
    if (index === -1) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const nextIndex = Math.min(
        Math.max(index + (event.key === "ArrowDown" ? 1 : -1), 0),
        items.length - 1
      );
      items.forEach((li, i) => { li.tabIndex = i === nextIndex ? 0 : -1; });
      items[nextIndex].focus();
      // .focus() alone scrolls in most browsers, but not predictably, 
      // explicit and consistent with the same fix on the command palette's
      // own arrow-key nav, which has no focus to lean on at all.
      items[nextIndex].scrollIntoView({ block: "nearest" });
    } else if (event.key === "Enter" && event.target === current) {
      // Only when the <li> itself has focus, not a button/link/textarea
      // inside it: those already handle their own Enter behaviour, and
      // this app has no separate "note view" to open: editing in place is
      // what opening a note means here.
      event.preventDefault();
      current.querySelector(".entry-actions [title='Edit this entry']")?.click();
    }
  });
}

// name -> {id, count}. Needed because renaming and deleting work on ids,
// while the sidebar itself is built from the entries already in memory.
let categoryMeta = new Map();

async function loadCategories() {
  const rows = await apiJson("/categories", { silent: true }).catch(() => []);
  categoryMeta = new Map(rows.map((c) => [c.name, c]));
  renderSidebar();
}

function renderSidebar() {
  // Categories + counts are derived from the loaded entries, the
  // simplest thing that works; no extra endpoint needed yet.
  // Drafts only belong in the Drafts row (user-reported: they were still
  // showing under All/category counts, undercutting the point of a
  // separate section): until saved as a real note, a draft doesn't count.
  const counts = new Map();
  for (const entry of allEntries) {
    if (entry.is_draft) continue;
    counts.set(entry.category, (counts.get(entry.category) || 0) + 1);
  }

  const ul = $("category-list");
  ul.replaceChildren();

  const addRow = (label, count, category) => {
    const li = document.createElement("li");
    if (category === activeCategory) li.classList.add("active");
    const name = document.createElement("span");
    name.className = "category-name";
    name.textContent = label;
    name.title = label;
    const badge = document.createElement("span");
    badge.className = "count";
    badge.textContent = count;
    li.append(name, badge);
    li.addEventListener("click", () => {
      activeCategory = category;
      draftsOnly = false; // exclusive with the Drafts filter below
      favouritesOnly = false; // and with Favourites, for the same reason
      // The list this filters lives in the "browse" sub-tab, and the sidebar
      // is visible from all four, so picking a category while writing a note
      // or asking a question filtered a list that was `display: none`, and the
      // click appeared to do nothing at all. Reported. The same fix
      // `flashEntry` already carries for jumping to a note, for the same
      // reason: a sidebar that is always on screen must be able to bring the
      // thing it controls on screen with it.
      showNotesSection("browse");
      renderSidebar();
      renderEntries();
    });

    // Rename/delete for real categories only, "All" is a filter, and
    // Uncategorised is where notes land when a category goes away.
    const meta = category ? categoryMeta.get(category) : null;
    if (meta && category !== "Uncategorised") {
      const actions = document.createElement("span");
      actions.className = "category-actions";
      actions.append(
        smallButton("ph:pencil-simple", `Rename ${category}`, (event) => {
          event.stopPropagation();
          renameCategory(meta, category);
        }),
        smallButton("ph:trash", `Delete ${category}`, (event) => {
          event.stopPropagation();
          deleteCategory(meta, category, count);
        })
      );
      li.appendChild(actions);
    }
    ul.appendChild(li);
  };

  addRow("All", allEntries.filter((e) => !e.is_draft).length, null);

  // A drafts count, not a category, asked for directly: a Drafts filter
  // findable in the same place categories are, so a note drafted with the
  // AI (Writing Room) or captured from a selection isn't only markable one
  // at a time via its own chip (entryItem). Always shown, even at 0, so it
  // stays discoverable rather than appearing only once something lands in it.
  const draftCount = allEntries.filter((e) => e.is_draft).length;
  const draftRow = document.createElement("li");
  draftRow.className = "category-drafts-row";
  if (draftsOnly) draftRow.classList.add("active");
  const draftName = document.createElement("span");
  draftName.className = "category-name";
  setLabel(draftName, "ph:pencil-simple-line Drafts");
  const draftBadge = document.createElement("span");
  draftBadge.className = "count";
  draftBadge.textContent = draftCount;
  draftRow.append(draftName, draftBadge);
  draftRow.addEventListener("click", () => {
    draftsOnly = !draftsOnly;
    favouritesOnly = false;
    activeCategory = null;
    showNotesSection("browse");
    renderSidebar();
    renderEntries();
  });

  // **Favourites.** Asked for as "a favourites folder or side parallel category
  // that isnt an actual category but could be treated as one if toggled", so
  // it is built exactly like Drafts directly above: a row where the categories
  // are, a count, a toggle, and mutually exclusive with the other two filters.
  // This app already has one pseudo-category, and a second that behaved
  // differently would be a second sign for the same idea.
  //
  // The notes it collects are the pinned ones (see `favouritesOnly`), no new
  // flag, no second place to star something.
  const favouriteCount = allEntries.filter((e) => e.pinned && !e.is_draft).length;
  const favouriteRow = document.createElement("li");
  favouriteRow.className = "category-drafts-row";
  if (favouritesOnly) favouriteRow.classList.add("active");
  const favouriteName = document.createElement("span");
  favouriteName.className = "category-name";
  setLabel(favouriteName, "ph:star Favourites");
  const favouriteBadge = document.createElement("span");
  favouriteBadge.className = "count";
  favouriteBadge.textContent = favouriteCount;
  favouriteRow.append(favouriteName, favouriteBadge);
  favouriteRow.title = "Notes you have starred, they also float to the top of every list";
  favouriteRow.addEventListener("click", () => {
    favouritesOnly = !favouritesOnly;
    draftsOnly = false;
    activeCategory = null;
    showNotesSection("browse");
    renderSidebar();
    renderEntries();
  });
  ul.appendChild(draftRow);
  ul.appendChild(favouriteRow);

  for (const [category, count] of [...counts.entries()].sort()) {
    addRow(category, count, category);
  }
}

async function renameCategory(meta, currentName) {
  const name = await promptDialog(`Rename "${currentName}" to:`, currentName);
  if (!name || name === currentName) return;

  // Renaming onto a category that already exists merges them, which is
  // usually the point: but it's destructive-looking, so it's confirmed.
  if (categoryMeta.has(name)) {
    const target = categoryMeta.get(name);
    const ok = (await confirmDialog(
      `"${name}" already exists. Merge "${currentName}" into it?\n\n` +
        `Its notes move across, nothing is deleted. "${name}" would then ` +
        `hold ${target.count + meta.count} notes.`
    ));
    if (!ok) return;
  }

  try {
    const result = await apiJson(`/categories/${meta.id}`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    });
    if (activeCategory === currentName) activeCategory = name;
    toast(result.merged ? `Merged into "${name}".` : `Renamed to "${name}".`);
    await loadEntries();
    await loadCategories();
  } catch (error) {
    toast(error.message, true);
  }
}

async function deleteCategory(meta, name, count) {
  const ok = (await confirmDialog(
    `Delete the category "${name}"?\n\n` +
      (count
        ? `Its ${count} note${count === 1 ? "" : "s"} are kept and become ` +
          `Uncategorised: deleting a category never deletes notes.`
        : "It has no notes in it.")
  ));
  if (!ok) return;
  try {
    await apiJson(`/categories/${meta.id}`, { method: "DELETE" });
    if (activeCategory === name) activeCategory = null;
    toast(`Deleted "${name}". Its notes are in Uncategorised.`);
    await loadEntries();
    await loadCategories();
  } catch (error) {
    toast(error.message, true);
  }
}

// Loading skeletons (Wave I): shimmer placeholders instead of a blank
// list on the very first load, so a slow disk never looks broken.
function showEntrySkeletons() {
  const list = $("entry-list");
  if (list.children.length > 0) return; // only ever on a truly empty list
  for (let i = 0; i < 3; i++) {
    const li = document.createElement("li");
    li.className = "skeleton";
    li.setAttribute("aria-hidden", "true");
    list.appendChild(li);
  }
}

//: The same placeholders for any list that fetches before it can draw
//: (INBOX 399 (4)): the Library's grid and the Timeline's feed showed a blank
//: card until their first response, which on a slow disk reads as an empty
//: notebook. Only into a list with nothing in it, so a refresh never covers
//: what is already there; the list's own render replaces them, and
//: `clearSkeletons` takes them out on a path that draws nothing (a failed
//: request). `aria-busy` tells a screen reader the list is on its way.
function showSkeletons(container, count = 3, tag = "div") {
  if (!container || container.children.length > 0) return;
  container.setAttribute("aria-busy", "true");
  for (let i = 0; i < count; i++) {
    const el = document.createElement(tag);
    el.className = "skeleton";
    el.setAttribute("aria-hidden", "true");
    container.appendChild(el);
  }
}

function clearSkeletons(container) {
  if (!container) return;
  container.removeAttribute("aria-busy");
  for (const el of container.querySelectorAll(":scope > .skeleton")) el.remove();
}

// A page of the plain list. Smaller than the backend's own default
// (`ENTRIES_PAGE_SIZE = 1000` in routes_entries.py, still the cap a caller
// gets by asking for nothing) on purpose, WORLD_CLASS_PLAN A2: the boot
// request for the whole notebook was the slowest fetch a cold start made, 258
// ms measured, and everything it carried past the first screenful was paid for
// before anything drew. The loop below renders each page as it lands, so this
// is the size of the first paint, not of the list: a notebook larger than this
// still ends up exactly as complete, one page later.
const ENTRIES_PAGE_SIZE = 200;

//: How long the list may go without showing a newly arrived page while the
//: background paging runs. Short enough that a big notebook still visibly
//: fills in, long enough that twenty-one pages are a handful of repaints
//: rather than twenty-one.
const ENTRIES_PROGRESS_MS = 250;
let _entriesProgressTimer = null;

function paintEntriesProgress() {
  clearTimeout(_entriesProgressTimer);
  _entriesProgressTimer = null;
  renderStatusBar(); // the notebook's size changed, and the bar reads it here
  renderEntries();
}

function scheduleEntriesProgress() {
  if (_entriesProgressTimer !== null) return;
  _entriesProgressTimer = setTimeout(paintEntriesProgress, ENTRIES_PROGRESS_MS);
}

async function loadEntries() {
  //: Wrapped, because every path below this either paints the notebook or
  //: throws, and a throw used to leave the skeletons and then the empty state
  //: on screen: "Your notebook is empty" is a claim about the person's own
  //: notes that a failed GET is no basis for. See `surfaceFailed`.
  return loadSurface($("empty-message"), "notes", _loadEntries);
}

async function _loadEntries() {
  const generation = ++_entriesLoadGeneration;
  referenceCountsCache.clear();
  reminderCountsCache.clear();
  showEntrySkeletons();

  const isSemantic = $("semantic-search-toggle")?.checked;
  if (isSemantic && noteSearch) {
    // Semantic search is already bounded server-side (SEMANTIC_LIST_LIMIT)
    //, nothing here needs paging.
    const results = await apiJson(
      `/entries?q=${encodeURIComponent(noteSearch)}&semantic=true`
    );
    if (generation !== _entriesLoadGeneration) return; // a newer load took over
    allEntries = results;
    entriesEverLoaded = true;
    renderStatusBar();
    renderSidebar();
    loadCategories();
    renderEntries();
    ensureMapChipsFor(results, generation);
    fillCategoryOptions($("entry-category"), null);
    refreshTagSuggestions();
    return;
  }

  // Paginated: GET /entries used to return the whole notebook in one
  // response, which is fine at a few hundred notes and a real risk of
  // timing out (or just feeling broken) at the size a "just works" notebook
  // reaches after years of use. The first page paints immediately, for
  // most notebooks that's everything, indistinguishable from before, and
  // any further pages fill in the background, so nothing downstream of
  // allEntries (search, keyboard nav, the sidebar, tag suggestions) had to
  // change: it still ends up exactly as complete as it always was.
  let offset = 0;
  let total = Infinity; // discovered from the first response's X-Total-Count
  //: Any repaint this load still owes. Cleared by `paintEntriesProgress`, so
  //: the immediate paint on the last page cannot be followed by a stale
  //: throttled one a moment later.
  clearTimeout(_entriesProgressTimer);
  _entriesProgressTimer = null;
  let first = true;
  while (offset < total) {
    const response = await api(`/entries?limit=${ENTRIES_PAGE_SIZE}&offset=${offset}`);
    const page = await response.json();
    if (generation !== _entriesLoadGeneration) return; // superseded mid-load

    allEntries = first ? page : allEntries.concat(page);
    entriesEverLoaded = true;
    offset += page.length;
    const reported = Number(response.headers.get("X-Total-Count"));
    total = Number.isFinite(reported) ? reported : allEntries.length;

    ensureMapChipsFor(page, generation);
    //: **Twenty-one pages used to mean twenty-one full re-renders.**
    //: `renderEntries()` costs 79 ms on a four thousand note list (measured
    //: at 1440x900), and the loop called it for every page, so a notebook
    //: that pages twenty-one times spent about 1.7 s of main thread redrawing
    //: a list that nobody had asked to change. The first page is what the
    //: reader is actually looking at; the pages after it are background.
    //:
    //: So the first page and the last one paint at once, the ones in between
    //: are throttled. The list still visibly grows, which is the point of
    //: painting during the load at all, it just grows in steps of a quarter
    //: second rather than in twenty-one full repaints.
    const lastPage = offset >= total || page.length === 0;
    if (first || lastPage) paintEntriesProgress();
    else scheduleEntriesProgress();
    if (first || offset >= total) {
      renderSidebar();
      // Categories the AI has filed notes into since the last load need
      // their ids fetched before rename/delete can work on them.
      // Deliberately not awaited: the list renders now and the controls
      // light up a moment later.
      loadCategories();
      fillCategoryOptions($("entry-category"), null);
      refreshTagSuggestions();
    }
    first = false;
    if (page.length === 0) break; // safety: never loop forever on a stale total
  }
  nudgeUntaggedNotes();
}

//: **What the note list needs to draw a `[[map]]` as a map chip**, fetched
//: once and only for a notebook that has one.
//:
//: `renderNoteInline` is synchronous and runs once per wiki link, so it cannot
//: fetch; the index has to be in memory before the render. It used to be
//: filled unconditionally at the top of `loadEntries`, which meant
//: `GET /whiteboard/boards?limit=200` on every cold start, 204 ms measured,
//: for a notebook that may contain no `[[` at all (WORLD_CLASS_PLAN A2). Now
//: the page that has just arrived is asked first, so a notebook with no wiki
//: links never asks for boards and one that has them asks once.
//:
//: The re-render is the half the old placement never had: fired and not
//: awaited, the index always landed *after* the render it was for, and the
//: chips stayed plain text until something else redrew the list. Guarded on
//: the load generation, because a newer `loadEntries` may have taken over
//: while this was in flight and its list is the one on screen.
//: **"In 2 documents · on 1 board · linked by 3 notes", on the card.**
//: INBOX 246's third gap: a card showed nothing until Connections was opened,
//: so a note on two boards and in three documents looked exactly like a
//: note nothing had ever touched. One muted chip on the card, opening
//: Connections, from one batched call per page (`/entries/reference-counts
//: ?ids=`): fifty cards asking `/references` each would be fifty scans per
//: render. Cleared with every reload (`_loadEntries`), which is also what
//: both attach panels call after a write, so a fresh attachment shows on
//: the next paint without a second cache to keep honest.
const referenceCountsCache = new Map();
const _referenceCountsInFlight = new Set();
const REFERENCE_COUNTS_BATCH = 60; // `REFERENCE_COUNT_IDS_MAX` in routes_entries.py
const REFERENCE_COUNT_PHRASES = [
  ["document", "in", "document", "documents"],
  ["board", "on", "board", "boards"],
  ["map", "on", "map", "maps"],
  ["note", "linked by", "note", "notes"],
];

function referenceCountText(counts) {
  const parts = [];
  for (const [kind, verb, one, many] of REFERENCE_COUNT_PHRASES) {
    const n = counts[kind] || 0;
    if (n) parts.push(`${verb} ${n} ${n === 1 ? one : many}`);
  }
  if (!parts.length) return "";
  // Read out loud as one line, sentence case on the first word only.
  const line = parts.join(" · ");
  return line[0].toUpperCase() + line.slice(1);
}

function referenceCountChip(entry, options = {}) {
  //: `facts` as well as `actions` (INBOX 297): what a note is joined to is
  //: true of the note wherever it is drawn, and this chip is DESIGN.md's
  //: "a fact on a facts line that is also the way in" rather than an action.
  if ((!options.actions && !options.facts) || entry.is_board || entry.is_draft) return null;
  const counts = referenceCountsCache.get(entry.id);
  if (!counts || !counts.total) return null;
  const refChip = chip(`ph:graph ${referenceCountText(counts)}`, "refs", (event) => {
    event.stopPropagation();
    openConnections(
      "entries",
      entry.id,
      entry.title || clipText(notePreviewText(entry.content).split("\n")[0], 80)
    );
  });
  refChip.title = "Everything this note is joined to. Open Connections";
  return refChip;
}

//: Called from the list's `afterChunk`, so it sees exactly the cards that
//: are in the DOM and asks for the ones the cache has not met. Cards are
//: patched in place rather than re-rendered: a re-render mid-chunking would
//: restart the incremental renderer that called this.
//: **What this note made you promise to do** (INBOX 309, the owner: "or to
//: link reminders to notes").
//:
//: The link itself was never missing: `Reminder.entry_id` has existed since
//: reminders did, the note card's own "Remind me" passes it, and the
//: `set_reminder` tool takes a `note_id`. One end of it was drawn and the
//: other was not: a reminder says which note it came from, and a note that
//: caused three reminders looked exactly like a note that caused none. So
//: this is the same answer INBOX 246 gave for boards and documents: one
//: muted chip on the card, from one batched count per page.
//:
//: **A chip on the facts line, not a section under the note.** The card is
//: already a title, a body and one line of facts about it, and a second
//: block under every note with a reminder would push the next note off the
//: screen for a fact that is usually one word long. It presses open the same
//: `.entry-links` row "Referenced by" and "Similar notes" use, which is also
//: what keeps it to one open panel per card.
const reminderCountsCache = new Map();
const _reminderCountsInFlight = new Set();

function reminderCountChip(entry, options = {}) {
  if ((!options.actions && !options.facts) || entry.is_board || entry.is_draft) return null;
  const count = reminderCountsCache.get(entry.id) || 0;
  if (!count) return null;
  const alarm = chip(`ph:alarm ${count} reminder${count === 1 ? "" : "s"}`, "reminders", (event) => {
    event.stopPropagation();
    toggleNoteReminders(entry);
  });
  alarm.title = "What this note made you promise to do. Press to see them";
  return alarm;
}

//: **The two count strips a card carries, as data.**
//:
//: They are the same mechanism twice over: read the ids on screen, ask once
//: for all of them, patch the chip onto the cards that are still there. The
//: reference counts had it first and the reminders would have been a second
//: copy of it, which is how the two would come to disagree about batching,
//: about a note deleted mid-flight, or about which generation of the list
//: they belong to. One walker, one table of what differs.
const CARD_COUNT_SOURCES = [
  {
    cache: referenceCountsCache,
    inFlight: _referenceCountsInFlight,
    path: (ids) => `/entries/reference-counts?ids=${ids}`,
    marker: ".chip.refs",
    //: A note the server did not answer for (deleted under us) is recorded
    //: as empty, not left unknown, or it would be asked for again on every
    //: chunk.
    empty: { total: 0 },
    chip: (entry) => referenceCountChip(entry, { actions: true }),
  },
  {
    cache: reminderCountsCache,
    inFlight: _reminderCountsInFlight,
    path: (ids) => `/reminders/counts?ids=${ids}`,
    marker: ".chip.reminders",
    empty: 0,
    chip: (entry) => reminderCountChip(entry, { actions: true }),
  },
];

function ensureCardCounts(list, generation) {
  for (const source of CARD_COUNT_SOURCES) ensureOneCardCount(list, generation, source);
}

function ensureOneCardCount(list, generation, source) {
  const wanted = [];
  for (const li of list.querySelectorAll("li[data-id]")) {
    const id = Number(li.dataset.id);
    if (!id || source.cache.has(id) || source.inFlight.has(id)) continue;
    wanted.push(id);
    if (wanted.length >= REFERENCE_COUNTS_BATCH) break;
  }
  if (!wanted.length) return;
  for (const id of wanted) source.inFlight.add(id);
  apiJson(source.path(wanted.join(",")), { silent: true })
    .then((answer) => {
      if (generation !== _entriesLoadGeneration) return;
      const counts = (answer && answer.counts) || {};
      for (const id of wanted) {
        const given = counts[String(id)];
        source.cache.set(id, given === undefined || given === null ? source.empty : given);
      }
      for (const id of wanted) {
        const li = list.querySelector(`li[data-id="${id}"]`);
        const meta = li && li.querySelector(":scope > .entry-meta");
        if (!meta || meta.querySelector(source.marker)) continue;
        const entry = allEntries.find((e) => e.id === id);
        const built = entry && source.chip(entry);
        if (built) meta.insertBefore(built, meta.querySelector(".entry-meta-end"));
      }
      // The page may hold more than one batch; the next call finds the rest.
      if (list.querySelectorAll("li[data-id]").length > wanted.length) {
        ensureOneCardCount(list, generation, source);
      }
    })
    .catch(() => {})
    .finally(() => {
      for (const id of wanted) source.inFlight.delete(id);
    });
}

function ensureMapChipsFor(page, generation) {
  if (mapBoardIndexCache) return; // one index per session, as it always was
  if (!page.some((entry) => String(entry.content || "").includes("[["))) return;
  loadMapBoardIndex()
    .then(() => {
      if (generation === _entriesLoadGeneration) renderEntries();
    })
    .catch(() => {});
}

//: **The app notices what the person has not got round to** (INBOX 162).
//: Once the notebook is loaded, a bell entry counts the real notes with no
//: tag and offers the filtered list. Keyed by the ISO week, so it is said
//: once a week at most however often the list reloads, and only past a
//: handful: three untagged notes is a Tuesday, not a backlog.
const UNTAGGED_NUDGE_MIN = 5;

function nudgeUntaggedNotes() {
  const untagged = allEntries.filter((e) => !e.is_board && !e.is_draft && !(e.tags || []).length);
  if (untagged.length < UNTAGGED_NUDGE_MIN) return;
  const now = new Date();
  const week = Math.floor((now - new Date(now.getFullYear(), 0, 1)) / (7 * 86400000));
  recordNotification({
    kind: "assist",
    title: `${untagged.length} notes have no tags`,
    detail: "Tags are how notes find each other. Open the list and add a few.",
    key: `untagged:${now.getFullYear()}-${week}`,
    action: { tab: "notes", filter: "is:untagged" },
  });
}
