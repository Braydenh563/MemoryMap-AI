// attach-to.js: the two inline pickers under a note card that put it on a board
// or in a document ("Put this note on a whiteboard or a mind map", "Add this
// note to a document"). Moved out of capture-ask.js on 2026-10-05 (the
// boot-script gzip budget, ratchet in tests/test_static_compression.py): each
// draws only after a person picks that action from a note's menu. Loaded on
// first use by `LAZY_MODULES.attachTo` (app.js), whose stand-ins for
// `renderAttachToBoard` and `renderAttachToDocument` fetch this file and then
// call the real one. Their one caller (`renderInlineAction`, lightbox.js)
// reads neither's result: both are `async` and fill the `wrap` element it
// already returned, so the picker appears a moment late on the first use of a
// session and on time after that.

//: **Put this note on a whiteboard or a mind map** (INBOX 246). The note goes
//: on the board as a card: a `WhiteboardNode` row written from the note's
//: side, the reference a board already stores, so "Referenced by" reads it
//: back with no new relation. The shape of `renderAttachToDocument` below,
//: one idea learned once. **No "new board" option**: a board needs a type and
//: a name, which is the Library's New board dialog, not a third creator.
async function renderAttachToBoard(entry, wrap) {
  const status = document.createElement("p");
  status.className = "muted";
  status.textContent = "Loading boards\u2026";
  wrap.appendChild(status);

  const boards = await apiJson("/whiteboard/boards", { silent: true }).catch(() => null);
  if (!boards) {
    status.textContent = "Couldn't load your boards.";
    return;
  }
  //: The unnamed scratch board (`id: null`) is left out: it is where things
  //: land when nobody chose a board, not somewhere to file a note on
  //: purpose, and it has no name to offer in a list.
  const named = boards.filter((board) => board.id != null);
  if (!named.length) {
    status.textContent = "No boards or maps yet. Make one in the Library first.";
    const only = document.createElement("div");
    only.className = "row";
    only.appendChild(
      smallButton("Cancel", "", () => {
        inlineAction = null;
        renderEntries();
      })
    );
    wrap.appendChild(only);
    return;
  }
  status.textContent = "Put this note on:";

  const picker = document.createElement("select");
  for (const board of named) {
    const option = document.createElement("option");
    option.value = String(board.id);
    //: The kind in the label, because the owner asked for whiteboards and
    //: mind maps by name and a list of bare titles does not say which is
    //: which. The word, not an icon: this is an `<option>`, and an option's
    //: text is all it has.
    option.textContent = `${board.title || "Untitled"} (${board.type === "map" ? "map" : "board"})`;
    //: The name on its own, for the toast. The `(board)` half belongs in a
    //: list where two kinds sit together and reads as part of the name
    //: anywhere else: "Put on \u201cHouse jobs (board)\u201d" is not a sentence
    //: somebody wrote.
    option.dataset.title = board.title || "Untitled";
    picker.appendChild(option);
  }

  const row = document.createElement("div");
  row.className = "row";
  row.appendChild(
    smallButton(
      "Attach",
      "Put this note on the chosen board",
      async () => {
        const id = Number(picker.value);
        const title = picker.selectedOptions[0]?.dataset.title || "that board";
        try {
          await apiJson("/whiteboard/nodes", {
            method: "POST",
            //: Placed rather than dropped at the origin: every board already
            //: has something at 0,0 sooner or later, and a card that lands
            //: exactly under another one reads as "nothing happened". This is
            //: the same offset the board's own "add a card" starts from, and
            //: the card is draggable the moment it is there.
            body: JSON.stringify({ entry_id: entry.id, board_id: id, x: 80, y: 80, z: 1 }),
          });
          inlineAction = null;
          await refreshEntries([entry.id]);
          toastAction(`Put on \u201c${title}\u201d.`, "Open", () => {
            if (typeof openWhiteboardBoard === "function") openWhiteboardBoard(id);
          });
        } catch (error) {
          toast(error.message, true);
        }
      },
      false
    )
  );
  row.appendChild(
    smallButton("Cancel", "", () => {
      inlineAction = null;
      renderEntries();
    })
  );
  wrap.append(picker, row);
  focusSelect(picker);
}

// The other direction, asked for straight after the capture-time picker:
// "what about adding a document to a note??". A note you wrote weeks ago
// turns out to belong to something you are writing now, and the capture box
// is long gone by then.
async function renderAttachToDocument(entry, wrap) {
  const status = document.createElement("p");
  status.className = "muted";
  status.textContent = "Loading documents…";
  wrap.appendChild(status);

  //: To the end, same reason as `loadCaptureDocuments`.
  const documents = await apiPagedList("/documents", 200).catch(() => null);
  if (!documents) {
    status.classList.add("error");
    status.textContent = "Couldn't load your documents.";
    return;
  }
  const already = new Set((entry.documents || []).map((doc) => doc.id));
  const free = documents.filter((doc) => !already.has(doc.id));

  status.textContent = free.length
    ? "Add this note to:"
    : documents.length
      ? "This note is on all of your documents, or start a new one:"
      : "No documents yet: start one:";
  const picker = document.createElement("select");
  for (const doc of free) {
    const option = document.createElement("option");
    option.value = String(doc.id);
    option.textContent = doc.title || "Untitled";
    picker.appendChild(option);
  }
  // Same offer as the capture box: the document this note belongs to often
  // does not exist until the note makes you realise you want it.
  const fresh = document.createElement("option");
  fresh.value = NEW_DOCUMENT;
  //: No mark at all, and that is the only honest answer here: an `<option>`
  //: may hold text and nothing else, so it cannot carry one of the app's
  //: icons, and a typed one beside a menu of Phosphor is the mismatch this
  //: rule exists to stop. The ellipsis already says "this opens something".
  fresh.textContent = "New document…";
  picker.appendChild(fresh);

  const row = document.createElement("div");
  row.className = "row";
  row.appendChild(
    smallButton(
      "Attach",
      "Add this note to the chosen document",
      async () => {
        let id = picker.value;
        let title = picker.selectedOptions[0]?.textContent || "that document";
        if (id === NEW_DOCUMENT) {
          const made = await createDocumentNamed(entry.content.trim().slice(0, 60));
          if (!made) return;
          id = String(made.id);
          title = made.title;
        }
        try {
          await apiJson(`/documents/${id}/notes`, {
            method: "POST",
            body: JSON.stringify({ entry_id: entry.id }),
          });
          inlineAction = null;
          await refreshEntries([entry.id]);
          toastAction(`Added to “${title}”.`, "Open", () =>
            openDocumentFromNote(Number(id))
          );
        } catch (error) {
          toast(error.message, true);
        }
      },
      false
    )
  );
  row.appendChild(
    smallButton("Cancel", "", () => {
      inlineAction = null;
      renderEntries();
    })
  );
  wrap.append(picker, row);
  //: `picker` is a `<select>`, so the same trap: see `focusSelect`. The
  //: `setTimeout` was there to wait for the element to be in the document;
  //: `focusSelect` waits for the frame that gives it its opener, which is the
  //: later of the two events and the one that actually matters.
  focusSelect(picker);
}
