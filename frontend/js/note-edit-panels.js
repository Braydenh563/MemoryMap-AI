// note-edit-panels.js: the two panels an open note's edit form shows under the
// text, "Similar" notes and the note's saved links, and the picker that attaches
// a saved link. Moved out of notes-list.js on 2026-10-05 (the boot-script gzip
// budget, ratchet in tests/test_static_compression.py): they draw only after a
// person presses Edit. Loaded on first use, in the same bundle as
// note-panels.js (`LAZY_MODULES.notePanels`, app.js; `similarNoteRow` is
// there), whose stand-ins for `renderRelatedWhileEditing` and
// `renderNoteBookmarksWhileEditing` fetch this file and then call the real
// one. `renderEditForm` calls both and reads neither's result (they are
// `async` and fill a panel they append themselves), so a stand-in's promise is
// the shape they already return; the panels appear a moment late on the first
// Edit of a session and on time after that.

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
  setLabel(panel, "ph:spin Finding related notes…");
  //: Above the form's foot (INBOX 606), which stays the last row.
  li.insertBefore(panel, li.querySelector(":scope > .note-edit-foot"));
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
  //: **Folded into one line until asked for** (INBOX 616, the owner: Related
  //: was "three large rows" under the text): "3 suggested links" with a caret,
  //: and the notes as compact chips with a + each once it is opened.
  panel.classList.add("note-edit-related");
  const list = document.createElement("div");
  list.className = "note-edit-related-list";
  list.hidden = true;
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "ghost small note-edit-related-toggle";
  toggle.setAttribute("aria-expanded", "false");
  const say = () => {
    const n = list.querySelectorAll(".entry-related-row").length;
    if (!n) {
      panel.textContent = "All related notes are linked.";
      return;
    }
    setLabel(toggle, `${list.hidden ? "ph:caret-right" : "ph:caret-down"} ${n} suggested link${n === 1 ? "" : "s"}`);
  };
  toggle.addEventListener("click", () => {
    list.hidden = !list.hidden;
    toggle.setAttribute("aria-expanded", String(!list.hidden));
    say();
  });
  for (const other of related) list.appendChild(similarNoteRow(entry, other, say));
  panel.append(toggle, list);
  say();
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
  li.insertBefore(panel, li.querySelector(":scope > .note-edit-foot"));

  //: In the form's foot, a quiet icon at its left (INBOX 606: a lone boxed
  //: button under everything else).
  const attachButton = document.createElement("button");
  attachButton.type = "button";
  attachButton.className = "ghost small icon-only";
  setLabel(attachButton, "ph:link-simple-horizontal");
  attachButton.title = "Attach a link";
  attachButton.setAttribute("aria-label", "Attach a link");
  attachButton.addEventListener("click", () => openBookmarkAttachPicker(entry, refresh));

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
          const path = `/entries/${entry.id}/bookmarks/${bookmark.id}`;
          const gone = await apiJson(path, { method: "DELETE" }).catch((error) => {
            toast(error.message, true);
            return null;
          });
          if (!gone) return;
          refresh();
          //: Undo puts it back where it was in the list (undo-1005): the
          //: DELETE answers with when it was attached, the order References
          //: are listed in. The panel repaints only while this note is open.
          const repaint = () => { if (editingId === entry.id && panel.isConnected) refresh(); };
          const reattach = async () => {
            await apiJson(`/entries/${entry.id}/bookmarks`, { method: "POST", body: JSON.stringify({ bookmark_id: bookmark.id, created_at: gone.created_at }) });
            repaint();
          };
          const action = pushUndo(`Removed the reference to ${bookmark.title || bookmark.url}`, reattach, async () => {
            await apiJson(path, { method: "DELETE" });
            repaint();
          });
          toastAction("Reference removed.", "Undo", async () => {
            settleUndoFromToast(action);
            await reattach().catch((error) => toast(error.message, true));
          });
        });
        makeUnlinkAccessible(detach);
        bmChip.appendChild(detach);
        panel.appendChild(bmChip);
      }
    }
    panel.hidden = !attached.length;
    const foot = li.querySelector(":scope > .note-edit-foot");
    if (foot) {
      if (!attachButton.isConnected) foot.prepend(attachButton);
    } else {
      panel.hidden = false;
      panel.appendChild(attachButton);
    }
  }
  await refresh();
}

//: **The app's one-thing picker on its Bookmarks source** (INBOX 616, the
//: owner: "the note edit form attach a link button doesnt do anything"). It
//: put a bare select into the References panel, which is hidden while the
//: note has no reference, so the first press drew nothing anyone could see,
//: and a pick re-ran the whole panel, which added a second Attach button. The
//: picker dialog (`pickLibraryItemDialog`, selection.js) is what the "/"
//: menu's bookmark link already uses; its empty state says where links come
//: from. `done` repaints the one panel this form already has.
async function openBookmarkAttachPicker(entry, done) {
  const chosen = await pickLibraryItemDialog("Attach a link", { sources: ["link"] });
  const id = chosen?.row?.id;
  if (id == null || editingId !== entry.id) return;
  try {
    await apiJson(`/entries/${entry.id}/bookmarks`, {
      method: "POST",
      body: JSON.stringify({ bookmark_id: Number(id) }),
    });
  } catch (error) {
    toast(error.message, true);
    return;
  }
  toast("Link attached.");
  done();
}
