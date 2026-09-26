// capture-ask.js: capture, notes and documents, Ask, suggested questions, Ask
// history. Moved out of app.js on 2026-09-26 as one contiguous range (INBOX 426
// cc, docs/roadmap/agent-remaining/appjs-split.md). A classic script sharing
// app.js's globals, loaded in app.js's old order; nothing in an earlier file
// calls into it while the page loads (scratchpad/appjs-map.js --check).

// --- capture -----------------------------------------------------------------

// Human explanations of how a note was filed ("visuals of what happened").
// A "go to it" link beside the save confirmation. Replaced each save, and
// cleared as soon as you start typing the next note.
function offerJumpToNewNote(saved, status) {
  if (!saved || !saved.id) return;
  const jump = document.createElement("button");
  jump.type = "button";
  jump.className = "ghost small jump-to-note";
  setLabel(jump, "ph:arrow-right Go to it");
  jump.title = "Open this note in your list";
  jump.addEventListener("click", () => flashEntry(saved.id));
  status.append(" ", jump);
}

// A deferred note's filing runs after its POST returns, so the composer has
// to find out where it landed some other way. It polls this one endpoint, 
// three fields, no joins, on a widening interval, because the answer
// arrives either in well under a second (a semantic match, no model call)
// or in however long the local model takes, and a fixed 250ms poll would
// spend most of its requests on the gap between those two.
//
// Giving up is deliberately quiet. The note is already saved and already in
// the list; the only thing a timeout costs is the toast, and a notebook
// whose model has gone away should not accumulate error messages for notes
// that saved perfectly well.
const FILING_POLL_STEPS = [400, 600, 900, 1400, 2000, 3000, 4000, 6000, 8000];

async function watchFiling(entry) {
  for (const wait of FILING_POLL_STEPS) {
    await new Promise((r) => setTimeout(r, wait));
    let status;
    try {
      status = await apiJson(`/entries/${entry.id}/filing`, { silent: true });
    } catch {
      return; // deleted, or the server went away, nothing to report
    }
    if (status.filing_state === "pending") continue;
    if (status.filing_state === "failed") {
      toast(`Saved, but Atlas couldn't file it: it's in “${status.category}”.`, true);
    } else {
      toastAction(
        `Filed under “${status.category}” (${status.ai_confidence}% sure).`,
        "Go to it",
        () => flashEntry(entry.id)
      );
      // The near-duplicate search moved into the same background pass, so
      // this warning arrives here now rather than on the create response.
      // Still purely informational, still never blocking, the note saved.
      if (status.similar) {
        toast(`Heads up: this is close to an existing note, “${status.similar.preview}”`);
      }
    }
    // The card in the list still says "Filing…" and still shows the holding
    // category until something re-reads it.
    await loadEntries();
    return;
  }
}

function filedByText(saved) {
  if (saved.filing_state === "pending") {
    return "Saved. Filing it in the background, keep writing.";
  }
  switch (saved.filed_by) {
    case "semantic-match":
      return `Filed under “${saved.category}” (${saved.ai_confidence}% sure): matched by meaning, no AI call needed`;
    case "llm":
      //: **"Atlas, running qwen2.5:7b"**, the form the owner's own decision
      //: names (INBOX 225): the librarian's name is what the app calls
      //: itself, and the model's name stays beside it, because "which model
      //: decided this" is the question this line exists to answer and a
      //: persona name alone would stop answering it.
      return `Filed under “${saved.category}” (${saved.ai_confidence}% sure): decided by ${aiNameNow()}${
        modelStatus && modelStatus.chat_model ? `, running ${modelStatus.chat_model}` : ""
      }`;
    case "user":
      return `Filed under “${saved.category}”: your choice, ${aiNameNow()} stayed out of it`;
    default:
      return `Saved as “${saved.category}”: ${aiNameNow()} wasn't available to file it`;
  }
}

// --- notes ↔ documents ------------------------------------------------------
// Asked for directly: "a way to link documents to new notes I create in the
// capture tab… the documents and notes sections need to be more integrated".
// The picker adds; the chips are how you take one back off before saving.

const captureDocuments = new Set();

//: Files waiting to become attachments on a note that does not exist yet.
//: The long "why staging" explanation lives on `handleFileUpload`, which is
//: the only thing that fills this.
//:
//: **Declared here, ~19,000 lines before its first write, and that is the
//: fix for a real crash.** It was originally declared next to
//: `handleFileUpload`, near the end of the file, but `renderCaptureFiles`
//: reads it, and the draft-restore IIFE calls that at module load time, from
//: *earlier* in the file. `let` is hoisted into the temporal dead zone
//: rather than initialised, so that read threw `Cannot access
//: 'captureStagedFiles' before initialization`, which aborted the rest of
//: app.js: `initAuth` never ran, the splash never hid, and the app sat on
//: its loading screen forever. Reported exactly that way, and caught by the
//: boot guard added the same session, which is the only reason the cause was
//: visible at all rather than being a silent hang.
//:
//: `node --check` does not catch this: it is valid syntax and a runtime
//: ordering fault. The lesson for anything similar: module-level state read
//: during load must be declared above every path that runs at load.
let captureStagedFiles = [];

async function loadCaptureDocuments() {
  //: To the end, not the first page: the picker exists to file this note
  //: under *any* document, and a document past the server's page would be
  //: invisible with nothing on screen saying so (`archive/agent-remaining/
  //: list-paging.md`). `apiPagedList` is one request at any realistic size.
  const documents = await apiPagedList("/documents", 200).catch(() => []);
  renderCaptureDocuments(documents);
}

// The picker's value for "one that doesn't exist yet". A string, so it can
// never collide with a document id.
const NEW_DOCUMENT = "new";

// Ask for a title and start an empty document. Shared by the capture box and
// the note card's "Add to a document", so both offer the same thing.
async function createDocumentNamed(suggestion = "") {
  const title = await promptDialog("Title for the new document:", suggestion, { confirmLabel: "Create" });
  if (!title) return null;
  try {
    const doc = await apiJson("/documents", {
      method: "POST",
      body: JSON.stringify({ title, content: `# ${title}\n\n` }),
    });
    return doc; // the documents tab refetches on switch, so nothing to sync
  } catch (error) {
    toast(error.message, true);
    return null;
  }
}

let captureDocumentTitles = new Map();
// The last list the server gave us, so removing a chip can put that document
// back in the adder's menu without a second round trip.
let captureDocumentList = [];

function renderCaptureDocuments(documents) {
  if (documents) {
    captureDocumentList = documents;
    captureDocumentTitles = new Map(documents.map((d) => [String(d.id), d.title]));
  }
  const box = $("entry-document-chips");
  box.replaceChildren();
  for (const id of captureDocuments) {
    const chipEl = chip(`ph:file-text ${captureDocumentTitles.get(String(id)) || id} ph:x`, "tag", () => {
      captureDocuments.delete(id);
      renderCaptureDocuments();
    });
    chipEl.title = "Don't attach this note to that document after all";
    box.appendChild(chipEl);
  }
  renderCaptureDocumentAdder();
}

//: **The picked documents are chips; the control that adds one is an adder.**
//:
//: Reported by the owner (INBOX 116) as "the add to document combobox not
//: changing", and it was not a bug in the handler: the handler wrote
//: `event.target.value = ""` on every pick *on purpose*, because a note can
//: go onto several documents and the select could only ever show one. So the
//: box snapped back to "None" the instant you chose something and the choice
//: appeared as a chip beside it. A select that refuses to hold the value you
//: just gave it reads as broken however correct its reasons are.
//:
//: The decision (recorded in UI_MODERNISATION_PLAN, "Decisions made"): a
//: thing you pick and it *acts* is a menu, and the recipe for a menu behind a
//: worded button is `labelledMenu` (DESIGN.md's recipe index). That is also
//: the shape "Attach" and "From library" already have on this same row, so
//: the three now read as one family of adders rather than one dropdown and
//: two buttons.
//:
//: Rebuilt rather than mutated on every render: the menu's contents depend on
//: which documents are already chips, and a five-item list is cheaper to
//: rebuild than to diff.
function renderCaptureDocumentAdder() {
  const slot = $("entry-document-adder");
  if (!slot) return;
  const items = [];
  for (const doc of captureDocumentList) {
    if (captureDocuments.has(doc.id)) continue;
    items.push(
      makeMenuItem(`ph:file-text ${doc.title}`, `Attach this note to “${doc.title}”`, () => {
        captureDocuments.add(doc.id);
        renderCaptureDocuments();
      }),
    );
  }
  // Asked for: "the add to document should have the option for a new document
  // as well". Wanting to file a note under something that does not exist yet
  // is the normal case at the start of a project, and leaving to make the
  // document loses the note you were in the middle of writing.
  items.push(
    makeMenuItem("ph:plus New document…", "Start a document and attach this note to it", async () => {
      const doc = await createDocumentNamed($("entry-content").value.trim().slice(0, 60));
      if (!doc) return;
      captureDocuments.add(doc.id);
      await loadCaptureDocuments(); // so the new one is in the list to remove
    }),
  );
  const adder = labelledMenu("ph:file-plus Add to document", items, "Add this note to a document", "ghost");
  slot.replaceChildren(adder);
}

//: **Put this note on a whiteboard or a mind map** (INBOX 246, the owner:
//: "I also want to be able to attach whiteboards and mindmaps to notes").
//:
//: "Attach" here means the thing a person means by it: the note goes on the
//: board, as a card, where they can see it. That is a `WhiteboardNode` row,
//: which is the reference the board already stores when it carries a note,
//: written from the note's side. No new relation, no second way for a note
//: and a board to be connected, and the "Referenced by" row above reads it
//: back without knowing which side wrote it.
//:
//: Deliberately the shape of `renderAttachToDocument` below, which does the
//: same job for documents: the same inline panel, the same select, the same
//: Attach/Cancel pair, the same toast with a way in. Two adders that behave
//: differently would be two things to learn for one idea.
//:
//: **No "new board" option**, unlike the document picker. A document made
//: from a note is a document with that note in it and nothing else to
//: decide; a board made from a note needs a type (board or map) and a name,
//: which is a dialog, and the Library's own "New board" already asks both.
//: Offering a half version here would be a third place that creates boards.
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
          await loadEntries();
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
          await loadEntries();
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

function openDocumentFromNote(documentId) {
  switchTab("documents");
  // The tab's own loader races us otherwise, and opens the last document.
  setTimeout(() => openDocument(documentId), 150);
}

// ROADMAP.md Tier 2 §16d, asked for directly: an optional title field
// where a note is created. Not a second stored field, it writes the same
// leading `# heading` line `manager.extract_title` already reads on every
// note (§43), so a title typed here reads back identically to one typed
// as the note's own first line. Only prepended when the title box actually
// has something in it, so a note with no title is unchanged from today.
function withTitle(content, title) {
  const trimmed = (title || "").trim();
  return trimmed ? `# ${trimmed}\n\n${content}` : content;
}

// Shared by saveEntry and saveEntryAsDraft: clear the capture box and every
// field that goes with it once the content has actually been saved
// somewhere. Pulled out rather than left duplicated, both paths need
// exactly this, and it drifting between two copies is how one of them ends
// up leaving a stale category or template selected after a save.
function resetCaptureForm(contentBox, titleBox) {
  contentBox.value = "";
  if (titleBox) titleBox.value = "";
  renderEntryAttachmentChips();
  autoGrow(contentBox); // the box shrinks back with its content
  localStorage.removeItem("captureDraft"); // it's saved for real now
  $("entry-count").textContent = "0 characters";
  $("entry-tags").value = "";
  $("entry-category").value = "";
  captureDocuments.clear();
  renderCaptureDocuments();
  clearCaptureTagSuggestions();
  // NOT cleared here: `captureStagedFiles`. `saveEntry` hands the list to
  // `uploadStagedFiles`, which takes ownership of it and empties it itself.
  // Clearing here as well would race that and silently drop the attachments
  // on every save: the composer resets before the uploads finish, by
  // design. `saveEntryAsDraft` clears it explicitly instead, below.
  renderCaptureFiles();
}

// **Tag suggestions while composing, not just after saving.** Reported
// directly: "the ai and application doesnt suggest tags either before
// creating a new note or after", "after" already existed
// (renderReevaluateResult, above), buried in a saved note's own kebab menu;
// "before" had nothing at all. `/entries/suggest-tags` needs only the
// draft's own text, so this can run on the Capture box itself, debounced the
// same way autosave-to-localStorage already is elsewhere in this file.
let captureTagSuggestTimer = null;
let captureTagSuggestSeq = 0; // invalidated on every keystroke, a slow reply
// to an earlier, shorter draft must never overwrite what a newer one asked for.

function clearCaptureTagSuggestions() {
  captureTagSuggestSeq++;
  clearTimeout(captureTagSuggestTimer);
  const row = $("entry-tag-suggestions");
  row.replaceChildren();
  row.classList.add("hidden");
}

function renderCaptureTagSuggestions(tags) {
  const row = $("entry-tag-suggestions");
  row.replaceChildren();
  if (!tags.length) {
    row.classList.add("hidden");
    return;
  }
  const label = document.createElement("span");
  label.className = "muted";
  label.textContent = "Suggested tags:";
  row.appendChild(label);
  for (const tag of tags) {
    const tagChip = chip(`ph:plus ${tag}`, "tag", () => {
      const box = $("entry-tags");
      const have = box.value.split(",").map((t) => t.trim()).filter(Boolean);
      if (!have.includes(tag)) box.value = [...have, tag].join(", ");
      tagChip.remove();
      if (!row.querySelector(".chip")) row.classList.add("hidden");
    });
    tagChip.title = `Add the "${tag}" tag`;
    row.appendChild(tagChip);
  }
  row.classList.remove("hidden");
}

function scheduleCaptureTagSuggestions() {
  clearTimeout(captureTagSuggestTimer);
  const content = $("entry-content").value.trim();
  // Not worth a round trip for a fragment this short, nothing useful to
  // label yet, and it would just relabel itself a few keystrokes later.
  if (content.length < 20) {
    clearCaptureTagSuggestions();
    return;
  }
  captureTagSuggestTimer = setTimeout(async () => {
    const seq = ++captureTagSuggestSeq;
    const tags = $("entry-tags").value.split(",").map((t) => t.trim()).filter(Boolean);
    let suggested;
    try {
      const result = await apiJson("/entries/suggest-tags", {
        method: "POST",
        body: JSON.stringify({ content, tags }),
      });
      suggested = result.suggested_tags || [];
    } catch {
      suggested = [];
    }
    if (seq !== captureTagSuggestSeq) return; // superseded by a later keystroke
    renderCaptureTagSuggestions(suggested);
  }, 1200);
}

//: Wipes the composer's error line as soon as the person answers it. Bound
//: once per complaint rather than at startup, so a composer that never
//: errored carries no listener at all, and `{ once: true }` means the pair
//: cannot accumulate over a session of near-misses.
function clearCaptureStatusOnInput() {
  const status = $("save-status");
  const clear = () => {
    if (!status.classList.contains("error")) return;
    status.textContent = "";
    status.classList.remove("error");
  };
  $("entry-content")?.addEventListener("input", clear, { once: true });
  $("entry-title")?.addEventListener("input", clear, { once: true });
}

async function saveEntry() {
  const contentBox = $("entry-content");
  const titleBox = $("entry-title");
  const status = $("save-status");
  const button = $("save-btn");

  const content = withTitle(contentBox.value.trim(), titleBox?.value);
  if (!content) {
    //: No exclamation mark (the copy rule), and it clears itself the moment
    //: anything is typed. Reported on 2026-09-09: "the words 'write something
    //: first' is at the bottom of the note capture tab when I didnt do
    //: anything?? maybe I fumbled a button." Nothing ever cleared this line,
    //: so one press of Save (or of Ctrl+S, which reaches the same button) on
    //: an empty box left an error sitting under the composer for the rest of
    //: the session, long after it had stopped being true.
    status.textContent = "Write something first, then save.";
    status.classList.add("error");
    clearCaptureStatusOnInput();
    return;
  }
  const tags = $("entry-tags").value.split(",").map((t) => t.trim()).filter(Boolean);
  const category = await resolveCategoryChoice($("entry-category"));
  if (category === undefined) return;

  // Filing in the background is the default, and the reason is the whole
  // point of the preference: filing asks a local model, so on a small
  // machine this form used to sit disabled behind "Filing…" for seconds
  // per note: reported as "the making of new notes was slow and annoying…
  // I feel like the note panels should disappear while filing and
  // continuing in the backend with a popup notification so I dont have to
  // wait twiddling my thumbs". Choosing a category yourself skips it
  // either way: there is nothing to wait for.
  const deferFiling = !category && (prefsCache.background_filing ?? true);

  button.disabled = true;
  status.classList.remove("error");
  status.textContent = category
    ? "Saving…"
    : deferFiling
      ? "Saving…"
      : modelStatus && !modelStatus.embedding_ready
        ? "Filing… (the search AI is still warming up, this first one can take longer)"
        : "Filing… (Atlas is reading and categorising your note)";
  try {
    //: **The pictures go up before the note does.** They were staged as
    //: `staged:<key>` urls while the note had no id (see `captureStagedImages`);
    //: this is the moment the user commits, so the bytes are uploaded and every
    //: placeholder in the text is replaced with the url the upload returned.
    //: A failure throws out of here and the save stops with the reason, a note
    //: saved with a dead `staged:` url in it would be a broken picture forever,
    //: and dropping the picture silently would be worse.
    const stagedUrls = await commitCaptureImages();
    const body = rewriteStagedUrls(content, stagedUrls);
    const saved = await apiJson("/entries", {
      method: "POST",
      body: JSON.stringify({
        content: body,
        tags,
        category,
        document_ids: [...captureDocuments],
        defer_filing: deferFiling,
      }),
    });
    clearStagedImages();
    status.textContent = filedByText(saved);
    if (saved.filing_state === "pending") watchFiling(saved);
    // The note finally has an id, which is the only thing the staged files
    // were ever waiting for. Not awaited: the composer is already clear and
    // the toasts report per file, making Save wait on N uploads would put
    // back exactly the blocking this session removed from filing.
    uploadStagedFiles(saved.id);
    if (saved.similar) {
      // Duplicate detection (Wave B): informational, never blocking.
      toast(
        `Heads up: this is ${Math.round(saved.similar.similarity * 100)}% similar ` +
          `to an existing note, “${saved.similar.preview}”`
      );
    }
    resetCaptureForm(contentBox, titleBox);
    await loadEntries();
    loadSuggestions(); // new categories → fresher recommended questions
    pushUndo(
      "Created a note",
      async () => {
        await api(`/entries/${saved.id}`, { method: "DELETE" });
        await loadEntries();
      },
      async () => {
        await api(`/entries/${saved.id}/restore`, { method: "POST" });
        await loadEntries();
      }
    );
    // Saving from Capture leaves you on Capture, with the note you just wrote
    // now somewhere in a list on another sub-tab. Offer to go to it rather
    // than making you switch tabs and hunt (user request). An offer, not a
    // jump: capturing several thoughts in a row is the common case, and
    // teleporting away after each one would fight that.
    offerJumpToNewNote(saved, status);
  } catch (error) {
    status.textContent = error.message;
    status.classList.add("error");
  } finally {
    button.disabled = false;
  }
}

// "No option to save a note as a draft in the capture section" (user-
// reported). is_draft already existed as a note field, the text-selection
// popup, the Writing Room, and "save this answer as a draft note" in chat
// all set it: but the primary capture box had no path to it. Deliberately
// skips category resolution: a draft is "save this fast, decide later", the
// same reasoning the other three draft-creating call sites already use, 
// none of them file a category either.
async function saveEntryAsDraft() {
  const contentBox = $("entry-content");
  const titleBox = $("entry-title");
  const status = $("save-status");
  const button = $("save-draft-btn");

  const content = withTitle(contentBox.value.trim(), titleBox?.value);
  if (!content) {
    //: No exclamation mark (the copy rule), and it clears itself the moment
    //: anything is typed. Reported on 2026-09-09: "the words 'write something
    //: first' is at the bottom of the note capture tab when I didnt do
    //: anything?? maybe I fumbled a button." Nothing ever cleared this line,
    //: so one press of Save (or of Ctrl+S, which reaches the same button) on
    //: an empty box left an error sitting under the composer for the rest of
    //: the session, long after it had stopped being true.
    status.textContent = "Write something first, then save.";
    status.classList.add("error");
    clearCaptureStatusOnInput();
    return;
  }
  const tags = $("entry-tags").value.split(",").map((t) => t.trim()).filter(Boolean);

  button.disabled = true;
  status.classList.remove("error");
  status.textContent = "Saving as draft…";
  try {
    //: Same commit-then-write order as a full save, a draft is a note with
    //: an id, so its pictures are real from the same moment.
    const stagedUrls = await commitCaptureImages();
    const saved = await apiJson("/entries", {
      method: "POST",
      body: JSON.stringify({
        content: rewriteStagedUrls(content, stagedUrls),
        tags,
        document_ids: [...captureDocuments],
        is_draft: true,
      }),
    });
    clearStagedImages();
    status.textContent = "Saved as a draft, find it later under Drafts in the sidebar.";
    resetCaptureForm(contentBox, titleBox);
    // A draft is still a note with an id, so staged files attach to it the
    // same way. Doing this here rather than in `resetCaptureForm` is what
    // keeps that function from having to know which of its two callers has
    // already taken the list, see its own comment.
    uploadStagedFiles(saved.id);
    await loadEntries();
  } catch (error) {
    status.textContent = error.message;
    status.classList.add("error");
  } finally {
    button.disabled = false;
  }
}

// --- ask ----------------------------------------------------------------------

// Follow-up memory (Round 1): the running conversation, sent back so the
// model can handle "and what about…". Capped so requests stay small.
let conversation = [];
const MAX_CLIENT_HISTORY = 4;
let askController = null; // AbortController for the in-flight stream
let lastQuestion = ""; // powers the Retry button

// Honest label for how the matching notes were found.
const SEARCH_MODE_LABELS = {
  // Both searches ran and their rankings were fused, which is the normal case
  // whenever an embedding backend is up. Named for what it is: "semantic
  // search" would now be a half-truth, and the label is the app's own account
  // of how it found what it is showing you.
  hybrid: "meaning + keywords",
  semantic: "semantic search",
  keyword: "keyword search",
  recent: "recent notes", // broad question → showing recent entries
  // These two were missing and rendered raw, so the panel said "dated", the
  // internal name, in a strip whose whole job is telling you in plain words how
  // the app found what it is showing you.
  dated: "by date",
  none: "nothing searched",
  // Matched the subject, not the stated time, see the note above
  // renderChatMeta's empty-results branch for the reasoning (§38 bug report:
  // a joke tagged joke/jokes/funny, asked about as "two weeks ago", was
  // actually three).
  outside_range: "matched, wrong time",
};

// Say something to a screen reader without putting anything on screen. Used
// for changes whose only visible signal is colour or position.
function announce(message) {
  const region = $("live-region");
  if (!region) return;
  // Clearing first guarantees the change is seen as new even when the same
  // message is announced twice in a row.
  region.textContent = "";
  requestAnimationFrame(() => (region.textContent = message));
}

// Jump to an entry in the Notes tab and flash it, shared by search
// results, most-used, and related-notes chips.
//: What the popup agent's "Use the open note" toggle reads when nothing is
//: being edited: the last note this session actually opened. `flashEntry` is
//: every route to a note there is (a search result, a citation, the graph, a
//: wiki link), which is why the tracking sits here rather than at the dozen
//: call sites.
let lastOpenedEntryId = null;

//: Bring the currently-open edit form into view within its nearest scrolling
//: ancestor, without moving the page scroll position. Called after
//: `renderEntries()` rebuilds the list from scratch, which resets the notes
//: pane's scroll to the top: the editing note might then be off screen.
//: Nearest-scroller pattern per DESIGN.md: `scrollIntoView` walks every
//: ancestor to the page, including the page itself, which is not what we want.
function scrollEditingEntryIntoView(id) {
  const li = document.querySelector(`#entry-list li[data-id="${id}"]`);
  if (!li) return;
  let node = li.parentElement;
  while (node && node !== document.body) {
    const style = getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) {
      const liTop = li.getBoundingClientRect().top;
      const nodeTop = node.getBoundingClientRect().top;
      const liBottom = liTop + li.offsetHeight;
      const nodeBottom = nodeTop + node.clientHeight;
      if (liTop < nodeTop) {
        node.scrollTop += liTop - nodeTop - 8;
      } else if (liBottom > nodeBottom) {
        node.scrollTop += liBottom - nodeBottom + 8;
      }
      return;
    }
    node = node.parentElement;
  }
  // Fallback: page-level scroll, only if no scrolling ancestor found.
  const rect = li.getBoundingClientRect();
  if (rect.top < 0) window.scrollBy(0, rect.top - 8);
}

function flashEntry(id) {
  lastOpenedEntryId = id;
  switchTab("notes");
  // The Notes tab is split into sub-tabs, and the note list lives in "browse".
  // Without this the card is found and scrolled to while its whole section is
  // display:none: so jumping to a note from a search result, the graph, or a
  // wiki link silently did nothing (user-reported).
  showNotesSection("browse");
  activeCategory = null;
  // A draft target needs the Drafts filter ON now that drafts are excluded
  // from every other view (user-reported): otherwise jumping to one from
  // Library's "Open" button would find nothing.
  draftsOnly = allEntries.some((e) => e.id === id && e.is_draft);
  // Same reason as the line above and the search reset below: a note that is
  // not pinned is filtered out of Favourites, so jumping to one while that
  // filter is on would scroll to nothing.
  favouritesOnly = false;
  // Clear any active filter too: a note that doesn't match the current search
  // is filtered out of the list, so there'd be nothing to scroll to.
  noteSearch = "";
  const searchBox = $("note-search");
  if (searchBox) searchBox.value = "";
  // **BACKLOG §77 item 2, the page half of "jump to a note."** Everything
  // above already resets category/drafts/search to whatever view actually
  // contains the target (the design question that item scoped: a jump
  // always lands in that reset default view, never in whatever filter the
  // *origin*, Chat, the graph, a document, happened to have active,
  // since most origins have no Notes-tab filter state to preserve at all).
  // With that view now fixed, `resolveNotePage` answers the one thing that
  // reset alone didn't: which *page* of it. Set before `renderEntries()` so
  // the list paints the right page the first time, not the first page
  // followed by a jump.
  const targetPage = resolveNotePage(id);
  if (targetPage) notesCurrentPage = targetPage;
  renderSidebar();
  renderEntries();
  requestAnimationFrame(() => {
    const card = document.querySelector(`#entry-list li[data-id="${id}"]`);
    if (!card) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    card.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    // Restart the animation even when the same note is jumped to twice in a
    // row: without the reflow the class is already there and nothing replays.
    card.classList.remove("flash");
    void card.offsetWidth;
    card.classList.add("flash");
    // Announce it too: a colour change alone tells a screen-reader user
    // nothing about where they've just been sent.
    // Just the note's own text: card.textContent would drag in the category
    // chip, every tag, and the confidence badge.
    const body = card.querySelector(".entry-content")?.textContent || "";
    announce(`Showing note: ${body.trim().slice(0, 80)}`);
    clearTimeout(flashEntry.timer);
    flashEntry.timer = setTimeout(() => card.classList.remove("flash"), 2700);
  });
}

// ROADMAP.md Tier 2 §13: changeRow's View button only ever reached notes and
// documents: reminders and categories had no navigation target at all, on
// top of having no backend id/name resolver. Same shape as flashEntry above.
async function flashReminder(id) {
  switchTab("reminders");
  // The change that brought us here (setting or completing a reminder) may
  // not match whatever filter was last active, "open" is the default, and
  // completing one is exactly the case where it would just have vanished.
  reminderFilter = "all";
  for (const b of document.querySelectorAll("#reminder-filter button")) {
    b.classList.toggle("active", b.dataset.filter === "all");
  }
  await loadReminders();
  requestAnimationFrame(() => {
    const item = document.querySelector(`#reminder-groups li[data-id="${id}"]`);
    if (!item) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    item.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    item.classList.remove("flash");
    void item.offsetWidth;
    item.classList.add("flash");
    announce(`Showing reminder: ${(item.textContent || "").trim().slice(0, 80)}`);
    clearTimeout(flashReminder.timer);
    flashReminder.timer = setTimeout(() => item.classList.remove("flash"), 2700);
  });
}

// Categories have no single note to scroll to, "View" means "show me what's
// in it", the same job the sidebar's own category filter already does.
function flashCategory(name) {
  switchTab("notes");
  showNotesSection("browse");
  activeCategory = name;
  draftsOnly = false;
  noteSearch = "";
  const searchBox = $("note-search");
  if (searchBox) searchBox.value = "";
  renderSidebar();
  renderEntries();
}

// A raw search result the user can click to open the note (Wave C).
//: `facts: true`, not `actions: true`. Reported as INBOX 297, "make sure all
//: the badges show", and measured rather than guessed: the same note drew
//: five chips in Browse and two here, because this call passed **no options
//: at all** and every chip in `entryItem` that is gated on `options.actions`
//: is gated on the row being one you can act on. Two of the three missing
//: ones deserve that gate ("Tag with Atlas" starts a model call, and the
//: "No tags yet" flag opens the edit form in a list that is not on screen);
//: the third, the reference count, is a plain fact about the note that
//: happened to be behind the same flag. So a second option, meaning "this
//: row is read-only, draw the facts anyway", rather than turning the actions
//: on and getting an edit button in a search result.
function clickableResult(entry) {
  const li = entryItem(entry, { facts: true });
  li.classList.add("clickable-result");
  li.title = "Open this note in the Notes tab";
  li.addEventListener("click", () => flashEntry(entry.id));
  return li;
}

// ROADMAP.md item 36: which retrieved note backs which sentence of a direct
// Q&A answer: surfaced the same understated way `match_info`'s own badges
// already are (a strip of small chips, not a rewrite of the answer's own
// text). One chip per *note* (not per sentence: several grounded sentences
// often share a note, and a chip per sentence would repeat itself), the
// chip's title carrying the actual sentence(s) it backs. Clicking a chip
// opens that note, same as a search result row already does.
// **Numbered citations in the answer itself.** Asked for directly: "inline
// referencing with hyperlinks in ai chat messages would be amazing."
//
// The data for this already existed and only ever reached a chip row *under*
// the answer: `ground_answer_sentences` (ai/grounding.py) returns
// {sentence, note_id} pairs, scored by word overlap against the notes that
// were actually retrieved: so the app already knows, per sentence, which
// note backs it. What it did not do was say so where the sentence is, which
// is the only place the claim and its source are read together.
//
// Deliberately conservative about *where* a marker may go: it walks real text
// nodes and only places one where a grounded sentence is found whole inside a
// single node. A sentence split across an <em> or a link is skipped rather
// than reassembled: a citation attached to the wrong half of a sentence is
// worse than no citation, and the chip row below still lists every source
// either way, so nothing is lost by skipping.
//: **`answerEl` is every prose block of the turn, latest first, not one
//: element.** Reported: an agent answer and a skill run showed no markers at
//: all, while a plain Ask answer showed them. The cause is one word:
//: `querySelector`. A skill run's timeline writes each step's prose into its
//: own `.bubble-answer` node (`startAnswer`, called again after every `step`
//: event), so the *first* one is step 1's narration and the run's real answer
//: is the last. The backend grounds the turn's whole prose as one string, so
//: every sentence it returned came from the final answer, and every one of
//: them was hunted for in the wrong paragraph.
//:
//: Latest first because a run repeats itself: a sentence the closing summary
//: and an intermediate step both contain belongs on the summary, which is
//: what a reader takes away. A step's own unique sentence still gets its
//: marker where it is, which is what walking all of them buys over simply
//: picking the last.
//: `orderedSources` is the Sources panel's own list, in the order it numbers
//: them. INBOX 81's second half asks that "the sources list numbers web
//: results after the notes so [5] resolves to a site", and reading the two
//: numberings side by side showed a wider problem than that: the panel counts
//: its rows from 1 in list order (notes, then what the turn touched, then
//: what it read off the web), while the block below counted from 1 in
//: *order first cited* among the grounded sentences. Those are two unrelated
//: sequences, so [2] in the prose and 2 in the panel were only ever the same
//: source by luck, with no web results involved at all.
//:
//: Passed rather than recomputed here, because the panel builds the list from
//: three inputs this function does not have, and two functions deriving "the
//: same" order independently is how they drift apart again. Optional, so the
//: Ask box's own call keeps its existing behaviour until it grows a panel to
//: agree with.
//: **One numbering, read by everything that prints a digit.** Reported of the
//: Ask tab: "In-text referencing and grounding in the ask subtab doesn't
//: stick, the wrong numbers will be used and in the wrong spot, and the
//: numbers wont match the grounding". Three things there number the same
//: sources: the markers in the prose, the "Grounded in" chips under it and
//: the Sources panel below that. Each counted for itself, so a note could be
//: 1 in the prose, 2 on a chip and 3 in the panel, and the Chat tab had
//: already been given the panel's order for exactly this reason while Ask had
//: not. A function rather than a convention: two loops that agree today are
//: two loops that disagree after the next edit to either.
//:
//: A note the panel did not list (it caps its rows) keeps a number after the
//: listed ones rather than none at all: an unnumbered citation is worse than
//: one whose row needs scrolling to.
function citationNumbers(sentences, orderedSources = null) {
  const numberFor = new Map();
  if (orderedSources && orderedSources.length) {
    orderedSources.forEach((source, index) => {
      if (source && source.kind === "note") numberFor.set(source.id, index + 1);
    });
    let next = orderedSources.length + 1;
    for (const g of sentences || []) {
      if (!numberFor.has(g.note_id)) numberFor.set(g.note_id, next++);
    }
  } else {
    for (const g of sentences || []) {
      if (!numberFor.has(g.note_id)) numberFor.set(g.note_id, numberFor.size + 1);
    }
  }
  return numberFor;
}

//: **What a sentence is matched on: its letters and digits, nothing else**
//: (INBOX 318). The grounded sentence is the answer's markdown source and the
//: page holds what the renderer made of it, and the two differ in exactly the
//: characters that carry no words: `**` and `*` vanish, a list's `- ` is
//: drawn as a bullet, a link keeps its text and loses its target, and
//: emphasis cuts one sentence into three text nodes. Measured with an answer
//: shaped the way a model writes (a lead-in, a list with bold labels, a
//: closing sentence with one word in italics): the grounding named every note
//: and not one marker was placed, because the old search looked for the raw
//: sentence inside one text node at a time. Compared on letters and digits
//: across the whole block, the formatting cannot make a sentence unfindable,
//: and it cannot make one match in the wrong place either: a sentence of a
//: dozen words is the same run of letters wherever it is drawn.
const CITATION_WORD_CHAR = /[\p{L}\p{N}]/u;

function citationKey(sentence) {
  //: `plainText` first, for the one difference that *is* letters: a link's
  //: target and a wikilink's brackets are not on the page.
  const text = plainText(sentence || "");
  let key = "";
  for (let i = 0; i < text.length; i += 1) {
    if (CITATION_WORD_CHAR.test(text[i])) key += text[i].toLowerCase();
  }
  return key;
}

//: The answer's own letters, in order, each with the text node and offset it
//: sits at. Rebuilt after every marker, because placing one splits a node and
//: the offsets after the split point move to the new half.
function citationTextIndex(targets) {
  let text = "";
  const at = [];
  for (const target of targets) {
    const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT, {
      //: A marker's own digit is not answer text, and neither is code: the
      //: backend never grounds a fenced block, so its letters could only
      //: produce a false match.
      acceptNode: (node) =>
        node.parentElement?.closest(".answer-citation, pre, .typing-dots, .typing-label")
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT,
    });
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const data = node.data;
      for (let i = 0; i < data.length; i += 1) {
        if (!CITATION_WORD_CHAR.test(data[i])) continue;
        for (const low of data[i].toLowerCase()) {
          text += low;
          at.push([node, i]);
        }
      }
    }
  }
  return { text, at };
}

//: Where the marker goes once the sentence's last letter is found: after the
//: punctuation that closes it, and outside any bold or italic the sentence
//: ended inside, so the digit is not drawn bold because the last word was.
const CITATION_CLOSING = /[.!?:;,)\]"'”’]/;
const CITATION_INLINE_TAGS = new Set(["STRONG", "EM", "B", "I", "A", "CODE", "MARK", "S", "DEL", "SPAN"]);
function citationInsertionPoint(node, offset, targets) {
  let end = offset + 1;
  while (end < node.data.length && CITATION_CLOSING.test(node.data[end])) end += 1;
  if (end < node.data.length) {
    const tail = node.splitText(end);
    return { parent: tail.parentNode, before: tail };
  }
  let anchor = node;
  while (
    !anchor.nextSibling &&
    anchor.parentElement &&
    CITATION_INLINE_TAGS.has(anchor.parentElement.tagName) &&
    !targets.includes(anchor.parentElement)
  ) {
    anchor = anchor.parentElement;
  }
  const next = anchor.nextSibling;
  if (next && next.nodeType === Node.TEXT_NODE) {
    let run = 0;
    while (run < next.data.length && CITATION_CLOSING.test(next.data[run])) run += 1;
    if (run) {
      const tail = next.splitText(run);
      return { parent: tail.parentNode, before: tail };
    }
  }
  return { parent: anchor.parentNode, before: anchor.nextSibling };
}

function addInlineCitations(answerEl, sentences, rawResults, orderedSources = null) {
  const targets = [
    ...(answerEl && !answerEl.nodeType ? [...answerEl] : answerEl ? [answerEl] : []),
  ];
  if (!targets.length) return;
  //: **Idempotent.** The Ask tab now calls this after every live paint as
  //: well as once at the end (INBOX 320), and a paint that happened not to
  //: rebuild the box would otherwise collect a second set of digits.
  for (const target of targets) {
    for (const old of target.querySelectorAll(".answer-citation")) old.remove();
    target.normalize();
  }
  if (!sentences || !sentences.length) return;
  const byId = new Map((rawResults || []).map((entry) => [entry.id, entry]));
  // One number per note, in the order they are first cited, the numbering a
  // reader expects, rather than note ids, which mean nothing to anyone.
  const numberFor = citationNumbers(sentences, orderedSources);
  //: One place per sentence, holding every note it was grounded to: a
  //: sentence about two notes gets both digits side by side, in number order.
  const bySentence = new Map();
  for (const g of sentences) {
    const key = citationKey(g.sentence);
    //: A dozen letters is about three words; below that a "sentence" is a
    //: fragment that could match anywhere, and the backend never grounds one.
    if (key.length < 12) continue;
    if (!bySentence.has(key)) bySentence.set(key, []);
    if (!bySentence.get(key).some((row) => row.note_id === g.note_id)) bySentence.get(key).push(g);
  }
  //: Longest first, and a claimed stretch is never reused by a different
  //: sentence: when one grounded sentence is contained in another, the short
  //: one must find its own occurrence, not the middle of the long one.
  const claimed = [];
  const overlaps = (start, end) => claimed.some(([s, e]) => start < e && end > s);
  const wanted = [...bySentence.entries()].sort((a, b) => b[0].length - a[0].length);
  for (const [key, rows] of wanted) {
    const index = citationTextIndex(targets);
    let start = index.text.indexOf(key);
    while (start !== -1 && overlaps(start, start + key.length)) {
      start = index.text.indexOf(key, start + 1);
    }
    if (start === -1) continue;
    claimed.push([start, start + key.length]);
    const [node, offset] = index.at[start + key.length - 1];
    const { parent, before } = citationInsertionPoint(node, offset, targets);
    rows.sort((a, b) => (numberFor.get(a.note_id) || 0) - (numberFor.get(b.note_id) || 0));
    for (const g of rows) parent.insertBefore(citationMarker(g, byId, numberFor), before);
  }
  collapseCitationRuns(targets);
}

//: **One mark per run, at its end** (the owner, 2026-09-24: "the amount of
//: intext referencing like with the 1's is a little excessive"). Measured on
//: that answer: a paragraph of three sentences from the one guide carried
//: three 1s in a row, and one of four carried four. A run of sentences in one
//: paragraph backed by the same notes is one claim to the reader, and the
//: convention (and every answer engine's) is one mark where the run ends.
//: A mark stays where the set of notes changes or the paragraph does, so no
//: sentence loses the source it came from; its hover passage moves to the
//: run's last mark, which is the one still drawn.
const CITATION_BLOCK = "p, li, blockquote, td, th, h1, h2, h3, h4, h5, h6, dd";
function collapseCitationRuns(targets) {
  for (const target of targets) {
    const groups = [];
    for (const marker of target.querySelectorAll(".answer-citation")) {
      const prev = marker.previousSibling;
      const last = groups[groups.length - 1];
      if (last && prev === last.markers[last.markers.length - 1]) {
        last.markers.push(marker);
      } else {
        groups.push({ markers: [marker], block: marker.closest(CITATION_BLOCK) || target });
      }
    }
    for (const group of groups) {
      group.key = group.markers.map((m) => m.dataset.noteId).sort().join(",");
    }
    for (let i = 0; i < groups.length - 1; i += 1) {
      const here = groups[i];
      const next = groups[i + 1];
      if (here.block === next.block && here.key === next.key) {
        for (const marker of here.markers) marker.remove();
      }
    }
  }
}

function citationMarker(g, byId, numberFor) {
  const marker = document.createElement("sup");
  marker.className = "answer-citation";
  //: Which note this digit stands for, on the element itself. The number
  //: was the only thing on screen tying a mark to a source, so nothing
  //: outside this function could check that the mark and the record row
  //: it points at agree (INBOX 299), and `showCitedPassage` already reads
  //: exactly this attribute off a source card.
  marker.dataset.noteId = String(g.note_id);
  const link = document.createElement("button");
  link.type = "button";
  link.className = "answer-citation-link";
  const entry = byId.get(g.note_id);
  // A note a tool read mid-turn is not in `rawResults`; the backend
  // sends its opening words on the entry itself for exactly this case.
  const name = noteLabel({ content: entry?.content || g.label || "" }, 40);
  link.textContent = String(numberFor.get(g.note_id));
  link.title = `Open the note this came from: ${name}`;
  link.setAttribute("aria-label", `Source ${numberFor.get(g.note_id)}: ${name}`);
  link.addEventListener("click", (event) => {
    event.stopPropagation();
    flashEntry(g.note_id);
  });
  //: **Hover shows the passage, not the whole note** (CHAT_PLAN decision
  //: 2, the last step of `archive/agent-remaining/chat-timeline-skills.md` item
  //: 1). The span has been on every grounding row since the passage
  //: scorer landed and nothing on screen read it, so a mark said "note 4"
  //: where it could say which forty words of note 4. The card is the
  //: place for it rather than a tooltip: it is already the thing that
  //: says what this source is, and a tooltip cannot hold a paragraph.
  const passage =
    Number.isInteger(g.start) && Number.isInteger(g.end) && g.end > g.start
      ? (entry?.content || "").slice(g.start, g.end)
      : "";
  if (passage) {
    for (const name of ["mouseenter", "focus"]) {
      link.addEventListener(name, () => showCitedPassage(g.note_id, passage));
    }
    for (const name of ["mouseleave", "blur"]) {
      link.addEventListener(name, clearCitedPassage);
    }
  }
  marker.appendChild(link);
  return marker;
}

//: The passage a citation came from, shown on its own card while the mark is
//: hovered or focused. Focus as well as hover, because a person moving
//: through an answer with Tab reaches these markers and would otherwise get
//: the one thing this adds only with a mouse.
function showCitedPassage(noteId, passage) {
  clearCitedPassage();
  //: **Both places a cited note can be drawn.** The Chat tab holds its
  //: sources as cards under the answer; the Ask tab holds its notes in the
  //: Matching records column beside it and draws no cards for them (INBOX
  //: 274). A mark that only knew about the cards did nothing at all on Ask
  //: once the cards went, which is a feature quietly lost rather than a
  //: duplicate removed.
  const cards = [
    ...document.querySelectorAll(`.chat-source-card[data-note-id="${noteId}"]`),
    ...document.querySelectorAll(`#raw-results li[data-id="${noteId}"]`),
  ];
  for (const card of cards) {
    //: A closed disclosure cannot show anything, and the mark is the reader
    //: asking to see this source: opened, and left open, because closing it
    //: again the moment the pointer moves would be the panel flickering at
    //: every mark passed over on the way down an answer.
    card.closest("details")?.setAttribute("open", "");
    card.classList.add("is-cited");
    const box = document.createElement("p");
    box.className = "chat-source-passage";
    const mark = document.createElement("mark");
    //: `textContent`, not the markdown renderer: this is a slice taken at
    //: character offsets, so it can begin mid-emphasis, and rendering half a
    //: `**` is how a highlight starts eating the rest of the card.
    mark.textContent = passage;
    box.appendChild(mark);
    card.appendChild(box);
  }
}

function clearCitedPassage() {
  for (const box of document.querySelectorAll(".chat-source-passage")) box.remove();
  for (const card of document.querySelectorAll(".is-cited")) card.classList.remove("is-cited");
}

// The "nothing in your notes, but…" row. Sent only on the empty path (see
// `_related_elsewhere`, routes_chat.py): a question whose answer lives in a
// document, a saved chat or a reminder used to end at "I couldn't find any
// saved notes matching that question", which is true and a dead end.
//
// Chips, matching every other "here is something to open" row in this app,
// each landing on the thing itself rather than on a search for it.
function renderRelatedElsewhere(target, items) {
  if (!target || !items || !items.length) return;
  const row = document.createElement("div");
  row.className = "answer-related";
  const label = document.createElement("span");
  label.className = "muted answer-grounding-label";
  label.textContent = "Elsewhere in your notebook:";
  row.appendChild(label);
  const icons = { document: "ph:file-text", chat: "ph:chat-circle", reminder: "ph:bell" };
  for (const item of items) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip chip-interactive answer-related-chip";
    setNoteLabel(button, icons[item.kind] || "ph:link", item.label || item.kind, 120);
    button.title = `Open this ${item.kind}`;
    button.addEventListener("click", () => {
      if (item.kind === "document") {
        switchTab("documents");
        openDocument(item.id);
      } else if (item.kind === "chat") {
        switchTab("chat");
        openConversation?.(item.id);
      } else if (item.kind === "reminder") {
        switchTab("reminders");
      }
    });
    row.appendChild(button);
  }
  target.appendChild(row);
}

//: The citation number, printed on the record it belongs to (INBOX 299).
//:
//: Guarded on the Ask tab's own grounding holder: the Chat tab calls
//: `renderAnswerGrounding` with a bubble's holder and has no records column,
//: so without this a chat turn would renumber a column left over from the
//: last question asked on the other tab.
//:
//: `.chat-source-index` rather than a mark of its own: the Sources panel
//: already draws "this is source n" that way, and one treatment learnt once
//: is the whole point of the recipe index. An uncited row gets no number
//: rather than a placeholder, because a digit that matches nothing in the
//: answer is worse than a row with none.
function numberMatchingRecords(target, numberFor) {
  if (!target || target.id !== "ai-answer-grounding") return;
  const list = $("raw-results");
  if (!list) return;
  for (const li of list.querySelectorAll("li[data-id]")) {
    li.querySelector(":scope > .record-index")?.remove();
    const n = numberFor.get(Number(li.dataset.id)) ?? numberFor.get(li.dataset.id);
    if (!n) {
      li.classList.remove("is-numbered");
      continue;
    }
    const mark = document.createElement("span");
    mark.className = "chat-source-index record-index";
    mark.textContent = String(n);
    //: Said aloud as well as shown: a screen reader reading "3" against a
    //: note has no way to know what the digit is counting.
    mark.setAttribute("aria-label", `Source ${n} in the answer`);
    mark.title = `The answer cites this note as ${n}`;
    li.classList.add("is-numbered");
    li.insertBefore(mark, li.firstChild);
  }
}

//: `question`, when the caller knows it, is what turns a click into a
//: correction: opening the third source after asking something is the one
//: signal the search has that its own order was wrong (WORLD_CLASS_PLAN I7,
//: and `search_manager._learned_order`, which has been reading these
//: corrections since Brief 23 while nothing in the browser wrote one). Left
//: optional because the third caller rebuilds an old chat from storage, and
//: a click on a source from last week is not evidence about today's ranking.
//: How much of an answer the notebook actually backed, said out loud.
//:
//: CHAT_PLAN Phase 1's fourth gate line, and Brief 12's decision: under half
//: the sentences supported, the app says so. The marks have always shown
//: *which* sentences came from notes; nothing showed how many, so an answer
//: with one cited sentence in six read, at a glance, exactly like one with six
//: in six. That is the one thing a notebook that cites must not get wrong.
//:
//: **The threshold is the backend's, not this file's** (`grounding.support`,
//: which sends `low` beside the numbers). Two places each choosing when an
//: answer counts as thin is two places to disagree, and the copy here would
//: then be describing a different answer from the one the marks describe.
//:
//: Placed above the answer rather than beside the chips below it: the chips
//: are a key to marks somebody has already read, and this is a thing to know
//: before reading. `.notice`, the app's recipe for exactly that
//: (08-consistency.css), in its `notice-warn` tone, which is an edge and not a
//: fill: a filled warning band would read as a failed answer, and it is not a
//: failed answer, it is an answer with less behind it than usual.
function renderAnswerSupport(answerEl, support) {
  //: Every prose block of the turn may be passed (a skill run has one per
  //: step); the notice belongs above the first.
  const first = answerEl && answerEl.length ? answerEl[0] : answerEl;
  if (!first || !first.parentElement) return;
  const existing = first.parentElement.querySelector(":scope > .answer-support");
  if (existing) existing.remove();
  if (!support || !support.low) return;
  const line = document.createElement("p");
  line.className = "notice notice-warn answer-support";
  line.setAttribute("role", "note");
  const { supported = 0, sentences = 0 } = support;
  setLabel(
    line,
    `ph:warning Only ${supported} of ${sentences} sentences here ` +
      `${supported === 1 ? "comes" : "come"} from your notes. ` +
      "The rest is the model's own writing, treat it as a draft."
  );
  first.parentElement.insertBefore(line, first);
}

//: INBOX 272 part 1, "every failure names its way out": the same
//: `.notice.notice-warn` recipe as `renderAnswerSupport` above, plus the one
//: control that fixes it, right under the turn that hit it rather than a
//: sentence pointing at a different screen. Only the Chat tab's Agent mode
//: can produce this event (the Ask box always sends `useTools: false`), so
//: this has one caller.
function renderToolsUnsupportedNotice(container, event) {
  if (!container || !event) return;
  const line = document.createElement("p");
  line.className = "notice notice-warn tools-unsupported-notice";
  line.setAttribute("role", "note");
  setLabel(line, `ph:warning ${event.message || "This model can't call tools."}`);
  const row = document.createElement("div");
  row.className = "row tools-unsupported-fix-row";
  row.appendChild(
    smallButton("ph:gear Change the model", "Open Settings, Models", () => {
      openSettingsModal("models", "chat-model-select");
    })
  );
  container.append(line, row);
}

function renderAnswerGrounding(
  target, sentences, rawResults, answerEl = null, question = "", orderedSources = null,
  support = null
) {
  if (!target) return;
  renderAnswerSupport(answerEl, support);
  // The markers go in the answer itself; the chip row below is their key.
  // Both are built from the same `sentences` and the same numbering
  // (`citationNumbers`), so they cannot disagree about which note is number 2,
  // and passing the panel's order in makes the third thing on screen agree too.
  addInlineCitations(answerEl, sentences, rawResults, orderedSources);
  target.replaceChildren();
  if (!sentences || !sentences.length) {
    target.classList.add("hidden");
    return;
  }
  const byId = new Map((rawResults || []).map((entry) => [entry.id, entry]));
  const byNote = new Map(); // note_id -> sentences[]
  const labelFor = new Map(); // note_id -> backend label, for touched notes
  for (const g of sentences) {
    if (!byNote.has(g.note_id)) byNote.set(g.note_id, []);
    byNote.get(g.note_id).push(g.sentence);
    if (g.label && !labelFor.has(g.note_id)) labelFor.set(g.note_id, g.label);
  }
  const label = document.createElement("span");
  label.className = "muted answer-grounding-label";
  label.textContent = "Grounded in:";
  target.appendChild(label);
  const numberFor = citationNumbers(sentences, orderedSources);
  //: **And the third place a digit is printed: the records column itself**
  //: (INBOX 299, the owner: "can the notes in the matching records that
  //: appear in the ask tab be numbered accordingly to match the inline
  //: referencing??"). Measured before this: five records on screen, five
  //: marks in the prose, and nought numbers in the column, so the two lists
  //: could only be read against each other by matching the words.
  //:
  //: From `numberFor`, here, rather than by numbering the column separately:
  //: that map is already what the markers, the chips and the Sources panel
  //: print, and a fourth loop deriving "the same" order is exactly how the
  //: first three came to disagree (see `citationNumbers`' own comment).
  numberMatchingRecords(target, numberFor);
  //: Drawn in the order the digits run, not in the order the sentences
  //: happened to arrive: a key whose rows read 2, 1, 3 is a key you have to
  //: search rather than read.
  const chips = [...byNote.entries()].sort(
    (a, b) => (numberFor.get(a[0]) || 0) - (numberFor.get(b[0]) || 0)
  );
  for (const [noteId, forSentences] of chips) {
    const entry = byId.get(noteId);
    const n = numberFor.get(noteId) || 0;
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip result-reason-chip result-reason-connected answer-grounding-chip";
    // Numbered to match the markers `addInlineCitations` puts in the answer, 
    // the row is the key to those, so the two have to count the same way.
    // `setNoteLabel`, not `setLabel`: the second half of this string is the
    // note's own Markdown, and the number is app-written, so they cannot go
    // through the renderer as one string (`1. ` is an ordered-list marker).
    setNoteLabel(chip, `ph:file-text ${n}.`, entry?.content || labelFor.get(noteId) || "", 30);
    chip.title = forSentences.join(" ");
    chip.addEventListener("click", () => {
      if (question) {
        apiJson("/learned/corrections", {
          method: "POST",
          silent: true,
          body: JSON.stringify({
            kind: "open_after_ask",
            subject: { question, entry_id: noteId },
          }),
        }).catch(() => {});
      }
      flashEntry(noteId);
    });
    target.appendChild(chip);
  }
  target.classList.remove("hidden");
}

//: **The answer object** (CHAT_PLAN.md decision 3, Phase 3). One shape for an
//: answer whichever surface produced it: `{question, text, sentences, sources,
//: related, next, stats, verification}`, where a sentence is
//: `{text, marks: [{note_id, start, end, score}]}`.
//:
//: Built here rather than at each call site because the three surfaces were
//: reading three different shapes of the same stream. Grounding arrives as one
//: row per *(sentence, note)* pair, which is the shape the scorer produces and
//: the wrong shape to render from: a sentence backed by two notes arrives
//: twice, and a renderer walking the rows draws the sentence twice with one
//: mark each instead of once with two. Folding it is a four-line job that had
//: been done differently, or not at all, in every place that needed it.
//:
//: `start`/`end` are the passage span of CHAT_PLAN decision 2 (Phase 1, not
//: built): carried through when the backend sends one and left `null`
//: otherwise, never defaulted to 0, because a start of 0 is a claim that the
//: passage begins at the note's first word and a renderer would highlight it.
function answerObject({
  question = "",
  text = "",
  grounding = [],
  meta = null,
  related = [],
  next = [],
  stats = null,
  verification = null,
  touched = [],
  toolEvents = [],
} = {}) {
  const bySentence = new Map();
  for (const row of grounding || []) {
    const sentence = row.sentence || "";
    if (!sentence) continue;
    if (!bySentence.has(sentence)) bySentence.set(sentence, { text: sentence, marks: [] });
    bySentence.get(sentence).marks.push({
      note_id: row.note_id,
      start: typeof row.start === "number" ? row.start : null,
      end: typeof row.end === "number" ? row.end : null,
      score: typeof row.score === "number" ? row.score : null,
      label: row.label || "",
    });
  }
  return {
    question,
    text,
    sentences: [...bySentence.values()],
    //: The same builder the Chat tab's bubble uses, so the two surfaces cannot
    //: disagree about what counts as a source or about the order they are
    //: numbered in.
    sources: chatSourcesFrom({ meta, toolEvents, touched }),
    related: related || [],
    next: next || [],
    stats: stats || null,
    verification: verification || null,
  };
}

//: **What the Ask tab draws under an answer** (CHAT_PLAN Phase 3, decision 8:
//: "Ask = Chat in single-turn mode"). Three components, none of them written
//: for this surface: `renderRelatedElsewhere`, `chatSourcesPanel` and the
//: follow-up strip are the Chat tab's, called here with the same object.
//:
//: Each gets its own container, which is the fix for a bug this restructuring
//: found: related items and grounding chips were both written into
//: `#ai-answer-grounding`, and `renderAnswerGrounding` opens with
//: `replaceChildren()`. The `related` event arrives before `grounding` on
//: every stream that has both, so "Elsewhere in your notebook" was built and
//: then deleted a moment later, on every answer, invisibly.
function clearAskAnswerFoot() {
  $("ask-answer-foot")?.classList.add("hidden");
  $("ask-answer-related")?.replaceChildren();
  $("ask-answer-sources")?.replaceChildren();
  const strip = $("ask-followups");
  if (strip) {
    strip.replaceChildren();
    strip.classList.add("hidden");
  }
}

function renderAskAnswerFoot(object, meta) {
  const foot = $("ask-answer-foot");
  if (!foot) return;

  const related = $("ask-answer-related");
  related.replaceChildren();
  related.classList.toggle("hidden", !object.related.length);
  if (object.related.length) renderRelatedElsewhere(related, object.related);

  const sources = $("ask-answer-sources");
  sources.replaceChildren();
  //: **The notes are on the right, so they are not also under the answer.**
  //: The owner, 2026-09-20, with a screenshot: "having the notes appear as
  //: sources below the ai response in the notes tab ask subtab is
  //: uncnecessary when they are shown already on the right next to the ai
  //: response". Measured on that screen: five numbered source cards under the
  //: answer and the same five notes, same ids, same order, as rows in
  //: Matching records beside it. The whole point of the two-column Ask layout
  //: is that the records are already in view; a second copy of them is the
  //: column's own content pushed down the page by a picture of itself.
  //:
  //: The Chat tab keeps its panel, and that is not an inconsistency: Chat has
  //: no column beside it, so the panel is the only place its sources can be.
  //: This is the same components arranged for a layout that already shows
  //: them.
  const onRight = askNotesOnTheRight();
  const here = object.sources.filter(
    (source) => source.kind === "note" && source.id != null && onRight.has(String(source.id))
  );
  //: Anything the column does not hold still needs somewhere to be: a file, a
  //: web result or a document is a source of this answer and Matching records
  //: is notes. Those keep the panel, and keep their own numbers, so a citation
  //: marker in the answer still points at the row it names.
  const elsewhere = object.sources.filter((source) => !here.includes(source));
  //: **No control for the notes the column is already showing** (the owner,
  //: 2026-09-21: "remove the show x notes used button in the ask subtab as
  //: well, it isnt needed"). It counted them and scrolled to the first one
  //: cited, which is a second door to a list that is already on screen beside
  //: the answer and carries the answer's own numbers on its rows. A control
  //: that leads to what you can already see is furniture.
  const panel = elsewhere.length
    ? chatSourcesPanel({ sources: elsewhere, meta, numberFrom: object.sources })
    : null;
  if (panel) sources.appendChild(panel);
  sources.classList.toggle("hidden", !panel);

  foot.classList.toggle(
    "hidden",
    !object.related.length && !panel && $("ask-followups").classList.contains("hidden")
  );
}

//: The note ids the Matching records column is showing right now, as strings
//: because that is what `dataset` answers on both sides of the comparison.
function askNotesOnTheRight() {
  const rows = document.querySelectorAll("#raw-results li[data-id]");
  return new Set([...rows].map((row) => row.dataset.id));
}


//: Into view through the nearest scrolling ancestor's own `scrollTop`, which
//: is DESIGN.md's rule: `scrollIntoView` walks every scrolling ancestor up to
//: the page, and the page moving is how a reader loses the answer they were
//: reading while trying to look at what it was built from.
function askRevealRecords(noteId = null) {
  const list = $("raw-results");
  if (!list) return;
  //: The row the answer cites first, when there is one, and the column's own
  //: top otherwise: a press that lands on source 1 answers "which notes?"
  //: with the note rather than with the heading above it.
  const row = noteId == null ? null : list.querySelector(`li[data-id="${noteId}"]`);
  const half = row || list.closest(".chat-half") || list;
  let node = half.parentElement;
  while (node && node !== document.body) {
    const style = getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1) {
      //: Rects rather than `offsetTop`, which is measured against the nearest
      //: *positioned* ancestor and not against the scroller.
      node.scrollTop += half.getBoundingClientRect().top - node.getBoundingClientRect().top;
      return;
    }
    node = node.parentElement;
  }
  const scroller = document.scrollingElement || document.documentElement;
  scroller.scrollTop += half.getBoundingClientRect().top - 12;
}

//: **A follow-up is a question that keeps the answer above it** (decision 8:
//: "'Ask again' chips become follow-ups that carry the previous answer as
//: context"). The chips themselves are `/chat/followups`, the same second
//: model call the Chat tab makes after a turn is on screen, and clicking one
//: calls `askQuestion`, which sends `conversation` as history: so the context
//: is carried by the path every Ask turn already takes, not by a second one
//: built for chips.
//:
//: Silent on every failure, including the AI not running: an answer that
//: arrived is not made worse by having nothing to offer after it.
async function renderAskFollowups(question, answer) {
  const strip = $("ask-followups");
  if (!strip) return;
  strip.replaceChildren();
  strip.classList.add("hidden");
  if (!question || !answer) return;
  let picks = [];
  try {
    picks = await apiJson("/chat/followups", {
      method: "POST",
      silent: true,
      body: JSON.stringify({ question, answer }),
    });
  } catch {
    return;
  }
  if (!Array.isArray(picks) || !picks.length) return;
  const label = document.createElement("span");
  label.className = "muted answer-grounding-label";
  label.textContent = "Ask next:";
  strip.appendChild(label);
  for (const pick of picks) {
    strip.appendChild(
      chip(pick, "Ask this next, keeping the answer above as context", () => {
        $("question").value = pick;
        askQuestion(pick);
      })
    );
  }
  strip.classList.remove("hidden");
  $("ask-answer-foot")?.classList.remove("hidden");
}

// The Ask box's "that isn't a question about your notes" card (§35A).
//
// Deliberately not rendered as an answer. Reported after the first version:
// a paragraph of instructions where the answer goes, next to a results panel
// saying "No matching records", reads as the app having broken rather than as
// guidance. Here the examples are buttons, a way forward from the same place,
// which also teaches the shape of a question that works.
function renderAskHint(box, hint) {
  box.replaceChildren();
  const card = document.createElement("div");
  card.className = "ask-hint";
  const text = document.createElement("p");
  text.className = "ask-hint-text";
  text.textContent = hint.text;
  card.appendChild(text);
  const row = document.createElement("div");
  row.className = "row ask-hint-examples";
  for (const example of hint.examples || []) {
    row.appendChild(
      smallButton(example, `Ask: ${example}`, () => {
        $("question").value = example;
        askQuestion(example);
      })
    );
  }
  if (row.childElementCount) card.appendChild(row);
  box.appendChild(card);
}

//: **The badge in the answer head, and the sentence behind it.**
//: The chip ellipsises now rather than wrapping the head onto a second line
//: (01-forms-settings.css, `.answer-model`, records the measurements), and an
//: ellipsis cuts the end off a model id, which is where the useful part of one
//: lives: `…Qwen2.5-14B-Instruct-GGUF:Q4_K_M`. So the full phrase always goes
//: on the `title` even when the visible text is complete, and the visible text
//: is as short as the fact allows: "answered by" spent about 100px of a 356px
//: column saying what a chip beside the words "AI answer" already says.
function setAnsweredBy(text, full) {
  const chip = $("answered-by");
  chip.textContent = text;
  //: Removed rather than emptied: an empty `title` is still a title, and a
  //: tooltip that opens blank reads as a broken one.
  if (full) chip.title = full;
  else chip.removeAttribute("title");
}

function renderChatMeta(meta) {
  $("search-mode").textContent = SEARCH_MODE_LABELS[meta.search_mode] || meta.search_mode;
  // "offline" only when Ollama is genuinely down, not merely because a
  // question found nothing to answer from.
  if (meta.answered_by) setAnsweredBy(meta.answered_by, `Answered by ${meta.answered_by}`);
  else if (meta.ollama_running === false) {
    setAnsweredBy("chat model offline", "The chat model is not running, so nothing answered this");
  } else setAnsweredBy("", "");
  const rawList = $("raw-results");
  rawList.replaceChildren();
  if (meta.raw_results.length === 0 && meta.search_mode === "none") {
    // Nothing was searched for, the message was not a question about the
    // notes. "No matching records" would report a failed search that never
    // happened, which is the half of the greeting case that read as broken.
    $("chat-results").classList.remove("hidden");
  $("ask-idle")?.classList.add("hidden");
    document.querySelector(".chat-half:last-child")?.classList.add("hidden");
    return;
  }
  document.querySelector(".chat-half:last-child")?.classList.remove("hidden");
  if (meta.search_mode === "outside_range" && meta.raw_results.length) {
    // Matched what was asked about, not when it was asked about, the note
    // is real, the stated time was just wrong (reported directly: a joke
    // asked about as "two weeks ago" that was actually three). Said before
    // the results, not folded silently into them, so this never reads as a
    // date-scoped answer it isn't.
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent = meta.when_phrase
      ? `Nothing about this in “${meta.when_phrase}”: here's what matched from another time:`
      : "Nothing in that time range, here's what matched from another time:";
    rawList.appendChild(li);
  }
  if (meta.raw_results.length === 0) {
    const li = document.createElement("li");
    li.className = "muted";
    // A dated question that found nothing has *two* facts to report, and only
    // saying the first is what makes an empty result look like a broken
    // search: nothing matched, **and** the window you named is why it was
    // looking so narrowly. Naming the phrase is also the fastest route to the
    // fix, because the next thing to try is asking again without it.
    li.textContent =
      meta.search_mode === "dated" && meta.when_phrase
        ? `Nothing matching “${meta.when_phrase}”. Try asking without it.`
        : "No matching records.";
    rawList.appendChild(li);
  }
  // Notes that came along because they are *connected* to a match are labelled
  // as such. Without it the panel shows notes about something else with no
  // explanation, which reads as the search having misfired, and the whole
  // point of pulling them in is that the person can see the connection.
  const connected = new Set(meta.connected_ids || []);
  const matchInfo = meta.match_info || {};
  for (const entry of meta.raw_results) {
    const row = clickableResult(entry);
    const badge = matchReasonBadge(matchInfo[entry.id]);
    if (badge) {
      if (connected.has(entry.id)) row.classList.add("result-connected");
      if (matchInfo[entry.id]?.type === "connected_2hop") row.classList.add("result-connected-2hop");
      row.appendChild(badge);
    }
    rawList.appendChild(row);
  }
  //: The reference count is a fact the card draws from a cache the *note
  //: list* fills, so a result row rendered before that list has been opened
  //: had nowhere to read it from and drew nothing. The same patch-in the
  //: note list uses, pointed at this list: one implementation, and a second
  //: one is how the two would come to disagree about what "linked by" counts.
  ensureCardCounts(rawList, _entriesLoadGeneration);
  $("chat-results").classList.remove("hidden");
  $("ask-idle")?.classList.add("hidden");
}

// Why a result showed up, as a badge, not a footnote. Reported directly:
// the one existing explanation ("Link linked to a match") was a muted chip
// easy to miss, and every *other* result, the actual matches, carried no
// reason at all, so "why is this here?" only had an answer for the minority
// of rows that arrived by connection rather than by matching. `match_info`
// (search/search_manager.py's `_retrieve`) now carries real provenance for
// the rest: a cosine similarity score for a semantic hit, the words that
// matched for a keyword hit, both for a hybrid one.
const MATCH_REASON_LABEL = {
  // `info.reason` is the link's own reason, when whoever made the link gave
  // one ("both about scheduling"), asked for directly: does a link's
  // reason show up here too, not just on the graph and in Trace. It does
  // now (search_manager.graph_expansion carries it through).
  connected: (info) => ({
    text: info.reason ? `ph:link Linked (${info.reason})` : "ph:link Linked to a match",
    title: info.reason
      ? `This note didn't match your question, it's here because it's linked to one that did: ${info.reason}.`
      : "This note didn't match your question, it's here because it is linked to one that did.",
  }),
  // ROADMAP.md item 33: an opt-in second hop, linked to something linked
  // to a match, not to the match itself. Real evidence, weaker evidence;
  // its own badge text says so rather than reading identically to a direct
  // connection, and `.result-connected-2hop` (style.css) renders it dimmer.
  connected_2hop: (info) => ({
    text: info.reason ? `ph:link Two steps away (${info.reason})` : "ph:link Two steps from a match",
    title: info.reason
      ? `This note is linked to a note that's linked to a match, not to the match itself: ${info.reason}.`
      : "This note is linked to a note that's linked to a match, not to the match itself, weaker evidence than a direct connection.",
  }),
  semantic: (info) => ({
    text: `ph:target ${Math.round(info.score * 100)}% similar`,
    title: `Matched by meaning, not exact words, ${Math.round(info.score * 100)}% cosine similarity to your question.`,
  }),
  keyword: (info) => ({
    text: `ph:magnifying-glass Matched “${info.terms.join("”, “")}”`,
    title: `Matched the word(s) “${info.terms.join(", ")}” in your question.`,
  }),
  hybrid: (info) => ({
    text: `ph:target ${Math.round(info.score * 100)}% similar · “${info.terms.join("”, “")}”`,
    title: `Matched both by meaning (${Math.round(info.score * 100)}% similarity) and by the word(s) “${info.terms.join(", ")}”.`,
  }),
};

function matchReasonBadge(info) {
  if (!info || !MATCH_REASON_LABEL[info.type]) return null;
  const { text, title } = MATCH_REASON_LABEL[info.type](info);
  const badge = document.createElement("span");
  badge.className = `chip result-reason-chip result-reason-${info.type}`;
  setLabel(badge, text);
  badge.title = title;
  return badge;
}

// Longer than the backend's own 120s per-chunk Ollama timeout (see the
// idle-read guard inside streamChat below) so a real "offline" answer from
// that always has time to arrive first.
const STREAM_IDLE_TIMEOUT_MS = 150_000;

// The one NDJSON stream reader, shared by the Notes quick-ask and the
// Chat tab (Wave C). Callers own all rendering via the handlers.
async function streamChat({
  question,
  history,
  persona,
  mode,
  useTools,
  noteIds,
  imageMediaIds,
  documentIds,
  fileIds,
  boardIds,
  skill,
  skillInputs,
  skillFromStep,
  skillOnlyStep,
  skillStepText,
  skillManual,
  skillManualNote,
  plan,
  notesOnly,
  attachedNotesOnly,
  answeringAgent,
  signal,
  onMeta,
  onPlan,
  onStep,
  onResult,
  onLimit,
  onThinking,
  onAnswer,
  onTool,
  onConfirm,
  onAsk,
  onRunSkill,
  onRunPlan,
  onCompressReview,
  onHint,
  onStats,
  onGrounding,
  onGroundingLive,
  onAnswerFinal,
  onRelated,
  onUnsupported,
}) {
  const body = { question, history: history || [] };
  if (persona) body.persona = persona;
  // Per-turn, not a setting: one quick answer shouldn't change the default
  // for every answer after it.
  if (mode) body.mode = mode;
  if (typeof useTools === "boolean") body.use_tools = useTools;
  if (notesOnly) body.notes_only = true;
  // The deliberately-closed-set case (Trace's "Generate story from path"):
  // retrieval must not add notes beyond the ones the caller attached.
  if (attachedNotesOnly) body.attached_notes_only = true;
  // A reply to the agent's own question ("yes", "ok") reads as small talk to
  // intent.classify, correctly, in isolation, which would otherwise route
  // it to the tool-less conversational path and strand whatever the model
  // was asking about (Tier 1 §4). The caller already knows this reply is
  // answering a pending `ask` event, so it says so rather than making the
  // classifier guess from three letters.
  if (answeringAgent) body.answering_agent = true;
  if (noteIds && noteIds.length) body.note_ids = noteIds;
  // Vision-capable models (ROADMAP.md's largest open item): ids from
  // /media/upload, the same endpoint the note/document editors already use
  // for drag-and-drop images: see `_resolve_chat_images` (routes_chat.py)
  // for how an id becomes a data URI the provider actually sends.
  if (imageMediaIds && imageMediaIds.length) body.image_media_ids = imageMediaIds;
  //: **Documents and files were staged, drawn, persisted -- and never sent
  //: here.** `streamChat` took `noteIds` and `imageMediaIds` and nothing else,
  //: so an attached document reached `/chat` (the non-streaming path, used by
  //: Ask) and never `/chat/stream`, which is the path the Chat tab actually
  //: uses. The chip appeared on the message, the id was saved on the
  //: conversation, and the model was never given a word of it -- the same
  //: failure `document_ids` shipped once before, one layer further out.
  if (documentIds && documentIds.length) body.document_ids = documentIds;
  if (fileIds && fileIds.length) body.file_ids = fileIds;
  //: A mind map attached by hand (MINDMAP_PLAN.md §5 item 11). Its own
  //: field, not folded into `note_ids`, because a board's `content` is the
  //: single line `# My map`, sent as a note the model would get a heading
  //: and be told it was a map. `_attached_boards` (routes_chat.py) turns the
  //: id into the outline instead.
  if (boardIds && boardIds.length) body.board_ids = boardIds;
  // Running a skill sends its name, not its prompt: the server owns what a
  // skill is, the steps, the values, the tools it may use, so the two
  // definitions can't drift apart.
  if (skill) {
    body.skill = skill;
    if (skillInputs && Object.keys(skillInputs).length) body.skill_inputs = skillInputs;
    // Resuming: the steps before this one ran in an earlier attempt and are
    // not repeated. Sent as an index rather than as a list of what to skip,
    // so the server stays the one place that knows what the steps are.
    if (skillFromStep) body.skill_from_step = skillFromStep;
    //: Re-running one step, optionally reworded (AGENT_SKILLS_REFORM.md Phase
    //: D). `!= null` rather than truthiness: step 0 is a step.
    if (skillOnlyStep != null) body.skill_only_step = skillOnlyStep;
    if (skillStepText) body.skill_step_text = skillStepText;
  }
  // A plan the model just made. Carries its own steps because nothing saved
  // it: that is the only way it differs from a skill run, here and on the
  // server.
  const hasPlan = plan && plan.steps && plan.steps.length;
  if (hasPlan) body.plan = plan;
  // Manual (step-through) mode: a pause after every completed step. Applies
  // equally to a saved skill or a plan the model just drew, both run
  // through the same step-by-step runner server-side. Sent on every call for
  // this run, resume included, since a run started manual stays manual.
  if (skill || hasPlan) {
    if (skillManual) body.skill_manual = true;
    if (skillManualNote) body.skill_manual_note = skillManualNote;
  }
  // NDJSON over a plain POST, deliberately, not a WebSocket. A WebSocket was
  // tried here and reverted: it needed the session on a second thread (a
  // SQLAlchemy Session is not thread-safe), it had to be mounted outside the
  // `locked` dependency and re-implement auth by hand, and a WS handshake is
  // exempt from the same-origin policy that protects this `fetch`, any page
  // the user had open could have opened it. `fetch` + a reader gives the same
  // token-by-token delivery with none of that.
  const response = await fetch("/chat/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-Token": authToken(),
      // Missing here, this fetch is hand-rolled rather than going through
      // api()/apiJson() (it needs the raw streaming body, which those don't
      // expose): and every one of the app's *other* fetches gets this
      // header automatically, so it was easy to not notice this one never
      // did. Reported directly: a space hidden from "All spaces" still
      // surfaced its notes from Ask's semantic search. The real bug was
      // wider than that one symptom, with no X-Workspace-ID at all,
      // get_session() never populates session.info["workspace_id"], so
      // database.py's workspace filter never runs, and *every* chat or Ask
      // turn searched every space regardless of which one was active,
      // hidden or not.
      "X-Workspace-ID": activeSpaceId(),
    },
    body: JSON.stringify(body),
    signal,
  });
  if (response.status === 401) {
    showLockScreen(false);
    throw new Error("Locked");
  }
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.detail || `Request failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffered = "";
  while (true) {
    // **No timeout on the stream** (reported: "the AI fails to respond
    // while still saying it is writing"). The backend's own read against
    // Ollama times out and turns into a real "offline" line on the wire, 
    // but only for a hang *inside that one socket call*. Anything that
    // stalls the backend before or between chunks (retrieval, a stuck
    // lock, a dead process) has nothing to catch it, and `reader.read()`
    // then waits forever with no sign of life. `STREAM_IDLE_TIMEOUT_MS` is
    // comfortably longer than the backend's own 120s per-chunk timeout, so
    // a real recovery message from *that* always wins the race; this is
    // only for the case where nothing, not even an error, ever arrives.
    const chunk = await Promise.race([
      reader.read(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("stream_idle_timeout")),
          STREAM_IDLE_TIMEOUT_MS
        )
      ),
    ]).catch((err) => {
      if (err.message === "stream_idle_timeout") {
        reader.cancel().catch(() => {}); // stop the underlying fetch too
        throw new Error(
          "The model stopped responding. It may still be loading a large " +
            "model, or Ollama may have stalled, try again, or check " +
            "Settings → Models."
        );
      }
      throw err;
    });
    const { done, value } = chunk;
    if (done) break;
    buffered += decoder.decode(value, { stream: true });
    const lines = buffered.split("\n");
    buffered = lines.pop(); // last piece may be a partial line
    for (const line of lines) {
      if (!line.trim()) continue;
      let event;
      // One malformed line must not abort a whole answer. Before this, a
      // single bad frame threw out of the read loop and the user saw a
      // half-written reply with no error.
      try {
        event = JSON.parse(line);
      } catch (parseErr) {
        recordBrowserLog("WARN", [`[Chat stream] Unparseable line: ${line.slice(0, 80)}`]);
        continue;
      }
      if (event.type === "meta") onMeta(event);
      else if (event.type === "plan" && onPlan) onPlan(event);
      else if (event.type === "step" && onStep) onStep(event);
      else if (event.type === "result" && onResult) onResult(event);
      else if (event.type === "limit" && onLimit) onLimit(event);
      else if (event.type === "thinking") onThinking(event.delta);
      else if (event.type === "answer") onAnswer(event.delta);
      else if (event.type === "tool" && onTool) onTool(event);
      else if (event.type === "confirm" && onConfirm) onConfirm(event);
      else if (event.type === "ask" && onAsk) onAsk(event);
      else if (event.type === "run_skill" && onRunSkill) onRunSkill(event);
      else if (event.type === "run_plan" && onRunPlan) onRunPlan(event);
      else if (event.type === "compress_review" && onCompressReview) onCompressReview(event);
      else if (event.type === "hint" && onHint) onHint(event);
      else if (event.type === "stats" && onStats) onStats(event);
      // ROADMAP.md item 36: which retrieved note backs which sentence of a
      // direct-Q&A answer. Only ever sent for that path (routes_chat.py).
      else if (event.type === "grounding" && onGrounding) onGrounding(event);
      //: INBOX 320: the rows so far, sent each time a sentence completes, so
      //: a record can be numbered while the answer is still being written.
      //: Provisional: the `grounding` event above replaces them at the end.
      else if (event.type === "grounding_live" && onGroundingLive) onGroundingLive(event);
      //: The finished answer, sent only when the server trimmed a greeting or
      //: a sign-off off it (routes_chat.py, `trim_assistant_padding`). The
      //: stream has already drawn the untrimmed text, so this replaces it once
      //: rather than filtering every delta, which would flicker.
      else if (event.type === "answer_final" && onAnswerFinal) onAnswerFinal(event);
      // Sent only when a question found no notes at all, the notebook is
      // more than its notes, so the answer names what else mentions it
      // (routes_chat.py's `_related_elsewhere`).
      else if (event.type === "related" && onRelated) onRelated(event);
      // INBOX 272 part 1: Agent mode was asked for and the model couldn't
      // call tools, so it answered as a plain question instead. Silently
      // dropped before this (routes_chat.py used to `pass` on it); now it
      // carries the remedy in `message` and the caller shows it.
      else if (event.type === "unsupported" && onUnsupported) onUnsupported(event);
      else if (event.type === "error") {
        // The server caught something mid-stream and said so. Surfacing it
        // beats the silent truncation this used to be.
        throw new Error(event.message || "The answer stopped early.");
      }

      if (event.type === "tool" && event.ok === false) {
        recordBrowserLog("WARN", [
          `[Agent tool error] ${event.label || event.name || "?"}: ${event.error || "unknown error"}`,
        ]);
      }
    }
  }
}

// Live markdown while streaming. Re-parsing the WHOLE accumulated answer on
// every animation frame is what made long answers feel laggy (each frame
// rebuilt the entire DOM). We now coalesce updates to ~15fps and skip the
// work entirely when the text hasn't changed: smooth, and far less main-
// thread churn, so other animations (the typing dots) don't stutter.
const LIVE_RENDER_INTERVAL_MS = 66;
//: `afterPaint`, when given, runs after every paint: a paint rebuilds the box
//: from raw markdown, so anything written into it afterwards (the Ask tab's
//: citation markers, placed while the answer streams, INBOX 320) has to be
//: written again each time or it lasts a fifteenth of a second.
function liveMarkdownRenderer(box, afterPaint = null) {
  let latest = "";
  let rendered = null;
  let timer = null;
  let lastRun = 0;

  const flush = () => {
    timer = null;
    lastRun = performance.now();
    if (latest === rendered) return; // nothing new since last paint
    rendered = latest;
    renderMarkdown(box, latest);
    afterPaint?.();
  };

  const render = (text) => {
    latest = text;
    if (timer) return;
    const wait = Math.max(0, LIVE_RENDER_INTERVAL_MS - (performance.now() - lastRun));
    timer = setTimeout(flush, wait);
  };
  //: **The last paint has to be cancellable, or it lands after the turn is
  //: over.** Measured while fixing INBOX 40: a skill run's citation markers
  //: were placed correctly and then vanished within a frame or two, and this
  //: is what removed them. Every delta schedules a paint up to
  //: `LIVE_RENDER_INTERVAL_MS` in the future; the stream then ends,
  //: `finalise()` re-renders each step from its raw markdown and the caller
  //: puts the markers in, and *then* the timer that was already armed fires
  //: and repaints the box from `latest`, throwing them away again. Nothing
  //: about it is visible: the prose is identical, only the markers are gone,
  //: which is why it read as "citations do not work in a skill run" rather
  //: than as a race.
  render.stop = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    rendered = latest; // so a later call cannot decide it still owes a paint
  };
  return render;
}

// Ask ⇄ Stop while a stream is in flight.
function setAsking(active) {
  $("ask-btn").classList.toggle("hidden", active);
  $("stop-btn").classList.toggle("hidden", !active);
  $("question").disabled = active;
}

function stopAnswer() {
  if (askController) askController.abort();
}

function newChat() {
  conversation = [];
  lastQuestion = "";
  clearAskAnswerFoot();
  $("chat-results").classList.add("hidden");
  $("ask-idle")?.classList.remove("hidden");
  $("new-chat-btn").classList.add("hidden");
  $("ask-status").textContent = "";
  $("question").value = "";
  loadSuggestions();
}

// Echo the question above its answer. Without it, an answer that has been on
// screen a while, or one you scrolled back to, is a paragraph with no
// subject.
function renderAskedQuestion(question) {
  const holder = $("asked-question");
  if (!holder) return;
  holder.replaceChildren();
  if (!question) {
    holder.classList.add("hidden");
    return;
  }
  const label = document.createElement("span");
  label.className = "asked-label";
  label.textContent = "You asked: ";
  const text = document.createElement("span");
  text.className = "asked-text";
  text.textContent = question;
  holder.append(label, text);
  holder.classList.remove("hidden");
}

//: **What the Ask tab shows while the model works** (INBOX 298, the owner:
//: "there's no generating animation while the model is thinking and streaming
//: in the ask tab either"). Measured before this: 250 of 250 frames with the
//: answer actually streaming had nothing moving on them anywhere.
//:
//: Three separate holes, one shape. `#ask-status` was plain text, so the
//: whole turn was a sentence sitting still. The typing dots went into the
//: answer box and `onThinking` removes them on the first thinking delta, so
//: a model that streams its reasoning (which is what the owner runs) loses
//: the indicator before the answer even starts. And `.is-generating`, the
//: app's one universal "this is the thing producing the output" ring, was
//: added on the first *answer* token rather than when the work began.
//:
//: The Chat tab already solved all three and wrote down why (see
//: `bubble.classList.add("is-generating")` and its comment): the ring goes on
//: before the request and comes off in the `finally`, and a `progressLine`
//: lives for the whole turn. So this is two existing components called from a
//: surface that never called them, not a new control: DESIGN.md's recipe
//: index has no room for a second way of saying "working".
function askStatusText(text = "") {
  const status = $("ask-status");
  if (!status) return null;
  status.replaceChildren();
  status.textContent = text;
  return status;
}

//: Returns the progress line itself, because the caller drives it: `setStatus`
//: for the words and `setPhase("writing")` for the moment the dots become the
//: writing trace. A fresh one per turn, since the component owns timers that
//: stop themselves when it leaves the page.
//: **The progress line belongs in the bubble it is filling** (the owner,
//: 2026-09-21, with a screenshot: the dots, "The model is thinking..." and
//: the rotating line were drawn above the AI ANSWER heading while the bubble
//: underneath held a second set of dots and nothing else). `#ask-status` sits
//: above the whole answer block, so a status put there describes the answer
//: from outside it and reads as a message about the page. It goes into
//: `#ai-answer`, where the text it is a placeholder for will appear, and the
//: separate typing dots that used to fill the bubble are gone with it: one
//: indicator, in the place the answer arrives.
function askStatusBusy(text) {
  const box = $("ai-answer");
  if (!box) return null;
  $("ask-status")?.classList.remove("error");
  $("ask-status")?.replaceChildren();
  box.replaceChildren();
  const line = progressLine(text);
  box.appendChild(line);
  //: **And brought into view, because it is now further down the page than
  //: the old one was.** `#ask-status` sat directly under the question box, so
  //: it was always in sight; the answer bubble is below the asked question
  //: and below the thinking disclosure, which expands as the model reasons and
  //: pushes the bubble further down. Reported as "nothing happens except the
  //: send button changing to stop": the indicator was there and off screen,
  //: which is the same thing as not having one.
  requestAnimationFrame(() => {
    try {
      line.scrollIntoView({ block: "nearest", behavior: "smooth" });
    } catch {
      //: An older engine without the options object still gets the default.
      line.scrollIntoView();
    }
  });
  return line;
}

async function askQuestion(preset) {
  const status = $("ask-status");
  const questionBox = $("question");

  const question = (preset ?? questionBox.value).trim();
  if (!question) {
    //: Sentence case and no exclamation mark: DESIGN.md's copy rule, and
    //: `tests/test_no_em_dashes.py`'s neighbour rules exist because this one
    //: kept coming back.
    askStatusText("Type a question first.");
    status.classList.add("error");
    return;
  }
  lastQuestion = question;

  // A new answer is coming, hide the suggestion/recent chips and the
  // per-answer action buttons until it lands.
  $("suggested-questions").classList.add("hidden");
  hide("retry-btn", "copy-btn", "speak-btn");
  setAsking(true);
  status.classList.remove("error");
  // Reset the output areas for the new answer.
  const answerBox = $("ai-answer");
  const thinkingBox = $("thinking-box");
  const thinkingText = $("ai-thinking");
  renderAskedQuestion(question);
  answerBox.textContent = "";
  //: After the reset, not before it: the progress line lives inside the
  //: answer box now, so creating it first would only have it wiped.
  const progress = askStatusBusy(
    modelStatus && modelStatus.embedding_ready
      ? "Searching your notes by meaning…"
      : "Searching your notes…"
  );
  const say = (text) => (progress ? progress.setStatus(text) : askStatusText(text));
  $("ai-answer-grounding").replaceChildren();
  $("ai-answer-grounding").classList.add("hidden");
  //: The whole foot goes with it, not only the grounding chips: a sources
  //: disclosure left open from the previous question is a list of notes that
  //: have nothing to do with the one being asked.
  clearAskAnswerFoot();
  thinkingText.textContent = "";
  thinkingBox.classList.add("hidden");
  thinkingBox.open = false;

  //: **On before the request, off in the `finally`.** The ring marks the
  //: thing producing the output for as long as it is being produced: added on
  //: the first token instead, it says nothing during the wait that is the
  //: part actually worth marking, which is the Chat tab's own recorded bug
  //: one surface over.
  answerBox.classList.add("is-generating");
  let answerRaw = "";
  let stopped = false;
  let groundingRawResults = []; // set by onMeta, read by onGrounding
  let groundedSupport = null; // how much of the answer the notes backed
  //: Kept beyond the callback that receives them, because the answer element
  //: is rebuilt after the stream ends and the markers have to be put back.
  let groundedSentences = [];
  //: Kept for the same reason: the answer object (CHAT_PLAN decision 3) is
  //: built once, after the stream, from every event the turn produced, and
  //: three of those events arrive long before the last token.
  let relatedItems = [];
  let answerStats = null;
  let answerMeta = null;
  // The box explained itself instead of answering, so the final markdown
  // pass, the saved turn and the answer actions all sit this one out.
  let hinted = false;
  //: **Numbered while it streams** (INBOX 320, the owner: "the numbers only
  //: appear after the ai response is finished"). The backend now grounds each
  //: sentence as it completes and sends the rows so far (`grounding_live`);
  //: the records column is numbered from them at once, and the markers are
  //: put back into the prose after every live paint, which rebuilds it. The
  //: numbering is the same `citationNumbers` over the same source order the
  //: finished answer uses (`chatSourcesFrom` over this turn's meta), so a
  //: digit that appears mid-answer is the digit it keeps.
  let liveSources = null;
  const placeLiveCitations = () => {
    if (groundedSentences.length) {
      addInlineCitations(answerBox, groundedSentences, groundingRawResults, liveSources);
    }
  };
  const renderLive = liveMarkdownRenderer(answerBox, placeLiveCitations);
  askController = new AbortController();
  try {
    // Stream: raw results arrive first, then thinking/answer tokens live.
    await streamChat({
      question,
      history: conversation.slice(-MAX_CLIENT_HISTORY),
      // Sent per turn now that this box has its own picker. It always obeyed
      // the *saved* mode via the server's fallback; carrying it explicitly is
      // what makes changing the box's dropdown affect the very next answer
      // rather than only the one after the preference round-trips.
      mode: $("ask-mode-select")?.value || null,
      useTools: false, // the quick-ask box is pure Q&A; actions live in the Chat tab
      // This box interrogates the notebook and nothing else (§35A). Sent as a
      // flag rather than left to the classifier, which is right about "hey"
      // being small talk: it is this surface that doesn't want small talk.
      notesOnly: true,
      signal: askController.signal,
      onMeta: (meta) => {
        renderChatMeta(meta);
        answerMeta = meta;
        groundingRawResults = meta.raw_results || [];
        say("Reading your notes…");
      },
      onThinking: (delta) => {
        //: Only a stray placeholder, never the progress line itself: that is
        //: the thing saying what is happening, and it stays until the first
        //: answer token replaces it.
        for (const stray of answerBox.querySelectorAll(".typing-dots, .typing-label")) {
          if (!progress || !progress.contains(stray)) stray.remove();
        }
        // Auto-expand while the model reasons (user request).
        thinkingBox.classList.remove("hidden");
        thinkingBox.open = true;
        thinkingText.textContent += delta;
        keepAtBottom(thinkingText); // follow the reasoning, unless scrolled away
        say("The model is thinking…");
      },
      onAnswer: (delta) => {
        //: The first answer token is the moment "waiting" becomes "writing",
        //: so the indicator changes with it. `setPhase` is idempotent, so
        //: calling it on every delta costs nothing.
        answerBox.querySelector(".typing-dots")?.setPhase?.("writing");
        if (thinkingBox.open) thinkingBox.open = false; // reasoning done → tuck away
        answerRaw += delta;
        // Same caret the Chat tab's timeline gets, for the same reason, see
        // `.is-streaming` in 01-forms-settings.css. Set here rather than
        // before the request because the dots own the "nothing yet" state.
        answerBox.classList.add("is-streaming", "is-generating");
        renderLive(answerRaw); // markdown renders AS it streams (user request)
        //: The indicator changes shape with the stage, not only its words: a
        //: three-dot "thinking" animation beside the sentence "the model is
        //: writing" is the exact mismatch reported of the Chat tab.
        progress?.setPhase("writing");
        say("The model is writing…");
      },
      onHint: (event) => {
        // Not an answer, so it does not go through the markdown renderer or
        // into the conversation: it is the box explaining itself.
        hinted = true;
        renderAskHint(answerBox, event);
        askStatusText("");
      },
      //: Collected, not drawn: it is a field of the answer object and is
      //: rendered with the rest of the foot once the stream is over. Drawing
      //: it here is what put it inside `#ai-answer-grounding`, which the
      //: grounding event then cleared out from under it.
      onRelated: (event) => {
        relatedItems = event.items || [];
      },
      onStats: (event) => {
        answerStats = event;
      },
      //: The server took a greeting or a sign-off off the answer, so the text
      //: on screen is not the text anything else will use. Repainted from the
      //: trimmed version, and `answerRaw` moves with it: the grounding markers
      //: placed a moment later are offsets into *this* string.
      onAnswerFinal: (event) => {
        answerRaw = event.text || answerRaw;
        renderLive(answerRaw);
      },
      onGroundingLive: (event) => {
        groundedSentences = event.sentences || [];
        liveSources ??= chatSourcesFrom({ meta: answerMeta, toolEvents: [], touched: [] });
        numberMatchingRecords(
          $("ai-answer-grounding"),
          citationNumbers(groundedSentences, liveSources)
        );
        placeLiveCitations();
      },
      onGrounding: (event) => {
        //: **Remembered here, drawn once at the end.** This used to draw the
        //: chips and the markers the moment the event arrived, which is
        //: before the answer has finished streaming and before the Sources
        //: panel exists. Both were then wrong in the way the owner reported:
        //: the markers were placed into prose that was still growing (and
        //: thrown away by the final markdown pass a moment later), and the
        //: chips were numbered with nothing to agree with, so the digits did
        //: not match the panel the foot drew underneath them.
        groundedSentences = event.sentences || [];
        //: Remembered with them and drawn in the same pass, for the same
        //: reason: the answer is still streaming when this arrives, so a
        //: notice placed now would sit above prose that is still growing.
        groundedSupport = event.support || null;
      },
    });

    //: **The live renderer's armed paint is cancelled before anything else**
    //: (`liveMarkdownRenderer`'s own `stop`, and the same call the Chat tab's
    //: `finalise` has made since INBOX 40). Reported as *"grounding and
    //: in-text referencing not working now"* and, more precisely, *"doesn't
    //: stick"*: measured, the markers were placed, all three of them, and a
    //: `setTimeout` armed up to `LIVE_RENDER_INTERVAL_MS` before the stream
    //: ended then fired and repainted this box from the raw markdown, which
    //: removes every one of them. The prose is identical either way, so
    //: nothing about it looks like a race; only the little numbers go.
    //:
    //: The Ask tab was the one caller of this renderer that never stopped it.
    //: The fix is the call, not a delay: a timer cancelled cannot fire late,
    //: whereas a longer wait only makes the race rarer.
    renderLive.stop();
    // Final render (catches anything after the last animation frame).
    if (!hinted) renderMarkdown(answerBox, answerRaw);
    //: **And the citations go back in.** Reported: *"in the ask tab, no inline
    //: or grounding links to the notes viewed and referenced appear."* The
    //: markers were being inserted, `onGrounding` fires during the stream and
    //: `addInlineCitations` writes them straight into the answer, and then
    //: the line above rebuilt the whole answer element from the raw markdown
    //: and threw every one of them away. The grounding event arrives *before*
    //: `done`, so this was true of every answer that had any: the feature ran,
    //: correctly, and its output survived for a few milliseconds.
    //:
    //: Applied once, here, rather than during the stream, because the live
    //: render is what makes the answer readable as it arrives and the markers
    //: simply have to be the last thing written, against the finished text.
    if (!hinted) {
      conversation.push({ question, answer: answerRaw });
      show("retry-btn", "copy-btn", "speak-btn", "new-chat-btn");
      //: **The answer object, rendered** (CHAT_PLAN Phase 3). Built after the
      //: stream rather than updated event by event, because two of its fields
      //: (the sentences and the sources they came from) are only complete when
      //: the last event has arrived, and a foot that rearranges itself under a
      //: reader mid-answer is worse than one that appears when the answer does.
      //: Built before the grounding is drawn rather than after, so the chips
      //: and the markers can be numbered from the panel's own list of sources
      //: (`citationNumbers`). The Chat tab has done this since the panel
      //: existed; the Ask tab numbered each of the three for itself, which is
      //: the "numbers wont match the grounding" that was reported.
      const answer = answerObject({
        question,
        text: answerRaw,
        grounding: groundedSentences,
        meta: answerMeta,
        related: relatedItems,
        stats: answerStats,
      });
      if (groundedSentences.length) {
        renderAnswerGrounding(
          $("ai-answer-grounding"),
          groundedSentences,
          groundingRawResults,
          answerBox,
          question,
          answer.sources,
          groundedSupport
        );
      }
      renderAskAnswerFoot(answer, answerMeta);
      //: Not awaited: it is a second model call, and the answer is already on
      //: screen. The same contract `offerFollowups` has in the Chat tab.
      renderAskFollowups(question, answerRaw);
    }
    askStatusText("");
    // Asking changes both quick-access lists, and, for a real (non-hint)
    // answer: the browsable history too.
    loadRecentQuestions();
    loadMostUsed();
    if (!hinted) {
      loadAskHistoryBadge();
      if (askHistoryOpen) loadAskHistoryPage(true);
    }
  } catch (error) {
    if (error.name === "AbortError") {
      stopped = true;
      //: Same reason as the success path above: Stop is an exit too, and an
      //: armed paint outlives the turn it belongs to.
      renderLive.stop();
      renderMarkdown(answerBox, answerRaw); // keep what streamed so far
      askStatusText("Stopped.");
      show("retry-btn", "copy-btn", "speak-btn");
    } else {
      askStatusText(error.message);
      status.classList.add("error");
    }
  } finally {
    // Every exit path, including Stop and an error: a caret still blinking on
    // an answer that stopped arriving is worse than never showing one.
    answerBox.classList.remove("is-streaming", "is-generating");
    askController = null;
    setAsking(false);
    // The question used to be cleared here, which left an answer on screen with
    // nothing saying what it answered (user-reported). It stays in the box, 
    // ready to refine and re-ask, and is echoed above the answer so the pair
    // reads together even after you start typing the next one.
    if (!stopped) questionBox.select();
  }
}

function retryAnswer() {
  if (lastQuestion) askQuestion(lastQuestion);
}

async function copyAnswer() {
  if (await copyToClipboard($("ai-answer").textContent)) toast("Answer copied.");
}

// --- suggested questions (Round 1) ----------------------------------------------

async function loadSuggestions() {
  const box = $("suggested-questions");
  // Only meaningful before the first answer of a conversation.
  if (!$("chat-results").classList.contains("hidden")) return;
  const picks = await apiJson("/chat/suggestions").catch(() => []);
  box.replaceChildren();
  box.classList.toggle("hidden", picks.length === 0);
  if (picks.length === 0) return;
  const label = document.createElement("span");
  label.className = "muted";
  label.textContent = "Try asking:";
  box.appendChild(label);
  for (const question of picks) {
    const chipEl = chip(question, "", () => askQuestion(question));
    box.appendChild(chipEl);
  }
}

// --- Ask history: browse back through every notes-only question, not just
// the last five as reask chips. Requested directly: "I want the ask feature
// to be basically a personal notes browser." Every turn behind this panel
// was already written server-side by chat_stream (routes_ask_history.py);
// this is read, search, pin, delete and "reopen" only. ---------------------

let askHistoryOpen = false;
let askHistoryOffset = 0;
let askHistoryTotal = 0;
const ASK_HISTORY_PAGE = 20;

async function loadAskHistoryBadge() {
  const badge = $("ask-history-badge");
  if (!badge) return;
  const stats = await apiJson("/ask-history/stats").catch(() => null);
  if (!stats || !stats.total) {
    badge.classList.add("hidden");
    return;
  }
  badge.textContent = stats.total > 99 ? "99+" : String(stats.total);
  badge.classList.remove("hidden");
}

function askHistoryRow(turn) {
  const li = document.createElement("li");
  li.className = "ask-history-item";
  li.dataset.id = turn.id;
  li.tabIndex = 0;
  li.setAttribute("role", "button");
  li.title = "Open this question and its answer";

  const head = document.createElement("div");
  head.className = "ask-history-item-head";
  const question = document.createElement("span");
  question.className = "ask-history-question";
  question.textContent = turn.question;
  head.appendChild(question);

  const actions = document.createElement("span");
  actions.className = "ask-history-actions";
  const pinBtn = document.createElement("button");
  pinBtn.type = "button";
  pinBtn.className = "icon-btn ask-history-pin" + (turn.pinned ? " active" : "");
  pinBtn.title = turn.pinned ? "Unpin" : "Pin so this survives Clear";
  pinBtn.setAttribute("aria-label", turn.pinned ? "Unpin question" : "Pin question");
  setLabel(pinBtn, turn.pinned ? "ph:push-pin-slash" : "ph:push-pin");
  pinBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleAskHistoryPin(turn.id, !turn.pinned);
  });
  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "icon-btn ask-history-delete";
  delBtn.title = "Delete this question";
  delBtn.setAttribute("aria-label", "Delete question");
  delBtn.innerHTML = '<i class="ph ph-trash" aria-hidden="true"></i>';
  delBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    deleteAskHistoryTurn(turn.id);
  });
  actions.append(pinBtn, delBtn);
  head.appendChild(actions);
  li.appendChild(head);

  const meta = document.createElement("div");
  meta.className = "ask-history-meta muted";
  const parts = [relativeTime(turn.created_at)];
  if (turn.result_count) {
    parts.push(`${turn.result_count} note${turn.result_count === 1 ? "" : "s"}`);
  }
  meta.textContent = parts.join(" · ");
  li.appendChild(meta);

  if (turn.answer_preview) {
    const preview = document.createElement("p");
    preview.className = "ask-history-preview";
    preview.textContent = turn.answer_preview;
    li.appendChild(preview);
  }

  const open = () => viewAskHistoryTurn(turn.id);
  li.addEventListener("click", open);
  li.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  });
  return li;
}

async function loadAskHistoryPage(reset) {
  if (reset) askHistoryOffset = 0;
  const list = $("ask-history-list");
  const params = new URLSearchParams({
    limit: String(ASK_HISTORY_PAGE),
    offset: String(askHistoryOffset),
  });
  const q = $("ask-history-search")?.value.trim();
  if (q) params.set("q", q);
  if ($("ask-history-pinned-only")?.checked) params.set("pinned_only", "true");
  const body = await apiJson(`/ask-history?${params}`).catch(() => null);
  if (!body) return;
  askHistoryTotal = body.total;
  if (reset) list.replaceChildren();
  for (const turn of body.turns) list.appendChild(askHistoryRow(turn));
  askHistoryOffset += body.turns.length;
  $("ask-history-empty").classList.toggle("hidden", askHistoryOffset > 0);
  $("ask-history-more").classList.toggle("hidden", askHistoryOffset >= askHistoryTotal);
}

function toggleAskHistoryPanel() {
  askHistoryOpen = !askHistoryOpen;
  $("ask-history-panel").classList.toggle("hidden", !askHistoryOpen);
  $("ask-history-toggle").setAttribute("aria-expanded", String(askHistoryOpen));
  if (askHistoryOpen) loadAskHistoryPage(true);
}

// Reopen a past turn exactly where a live answer renders, no re-asking the
// model, which is the whole point of this being a browser and not a search
// box that happens to remember your last five questions.
async function viewAskHistoryTurn(id) {
  const turn = await apiJson(`/ask-history/${id}`).catch(() => null);
  if (!turn) {
    toast("That question is no longer in your history.", true);
    return;
  }
  $("suggested-questions").classList.add("hidden");
  $("question").value = turn.question;
  lastQuestion = turn.question;
  renderAskedQuestion(turn.question);
  const answerBox = $("ai-answer");
  renderMarkdown(answerBox, turn.answer);
  $("ai-answer-grounding").replaceChildren();
  $("ai-answer-grounding").classList.add("hidden");
  clearAskAnswerFoot();
  $("thinking-box").classList.add("hidden");
  //: **A reopened turn is the answer object, not a paragraph of its text**
  //: (INBOX 241, the owner: "the grounding, intext numbered referencing, and
  //: sources that appeared in the ask subtab in notes, dissappeared on reload
  //: and didnt persist. they didnt persist when I reaccessed them through the
  //: history panel"). The two clears above are still right, they are what
  //: takes the *previous* answer's foot down, and until now nothing put this
  //: one's back up: the panel redrew the prose, the results and the badges and
  //: stopped, so every citation and every source card was lost the moment a
  //: turn was browsed rather than asked.
  //:
  //: Built from the same two calls the live path ends on,
  //: `renderAnswerGrounding` (which puts the numbered markers into the answer
  //: itself as well as drawing the chip row that is their key) and the foot
  //: from `answerObject`. The live path calls `addInlineCitations` a second
  //: time after those, and this deliberately does not: there it is a repair,
  //: its final `renderMarkdown` rebuilds the answer element and throws the
  //: markers away, whereas here the markdown is rendered *before* the
  //: grounding, so the markers are already the last thing written. Calling it
  //: again would mark every grounded sentence twice, the walker's `placed` set
  //: being per call and the guard only skipping text already inside a marker.
  //: `meta` carries only `raw_results` because that is all `chatSourcesFrom`
  //: reads for a notes-only turn, which every Ask turn is.
  //:
  //: What is deliberately *not* rebuilt: the follow-up chips and the stats
  //: line. Both are a fresh model call and a live timing, neither belongs to
  //: the turn being reopened, and `setAnsweredBy` below already says this is
  //: a remembered answer rather than one just written.
  //: **The records first, then what reads them** (the owner, 2026-09-24: a
  //: reopened question lost its record numbers and grew a Sources box of
  //: the same notes). `numberMatchingRecords` and `askNotesOnTheRight`
  //: both read `#raw-results`, and this used to fill it after both ran.
  const rawList = $("raw-results");
  rawList.replaceChildren();
  // Same badges as a live Ask answer: this turn's own match_info/connected_ids
  // were saved alongside it (routes_chat.py's _save_ask_turn) for exactly
  // this reason: browsing back shouldn't lose the "why" a result showed up.
  const connected = new Set(turn.connected_ids || []);
  const matchInfo = turn.match_info || {};
  for (const entry of turn.raw_results) {
    const row = clickableResult(entry);
    const badge = matchReasonBadge(matchInfo[entry.id]);
    if (badge) {
      if (connected.has(entry.id)) row.classList.add("result-connected");
      if (matchInfo[entry.id]?.type === "connected_2hop") row.classList.add("result-connected-2hop");
      row.appendChild(badge);
    }
    rawList.appendChild(row);
  }
  if (turn.omitted_results) {
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent =
      turn.omitted_results === 1
        ? "1 note from this answer is no longer available (deleted or made private since)."
        : `${turn.omitted_results} notes from this answer are no longer available (deleted or made private since).`;
    rawList.appendChild(li);
  }
  const groundingRows = turn.grounding || [];
  const historyMeta = { raw_results: turn.raw_results || [] };
  //: Built first, for its `sources`: a reopened turn numbers its markers,
  //: chips and panel rows together, the same way the live path does.
  const remembered = answerObject({
    question: turn.question,
    text: turn.answer,
    grounding: groundingRows,
    meta: historyMeta,
  });
  if (groundingRows.length) {
    renderAnswerGrounding(
      $("ai-answer-grounding"),
      groundingRows,
      historyMeta.raw_results,
      answerBox,
      turn.question,
      remembered.sources,
      //: The stored turn's support (`routes_ask_history.py`), so a reopened
      //: answer keeps the low-support notice the live one had.
      turn.support || null
    );
  }
  renderAskAnswerFoot(remembered, historyMeta);
  $("ai-thinking").textContent = "";
  //: A remembered turn says *when* rather than *what by*: the model that
  //: answered it may not even be installed any more. The tooltip carries the
  //: same fact spelled out, since the chip is ellipsised.
  setAnsweredBy(`asked ${relativeTime(turn.created_at)}`, `Asked ${relativeTime(turn.created_at)}`);
  $("search-mode").textContent = SEARCH_MODE_LABELS[turn.search_mode] || turn.search_mode;
  document.querySelector(".chat-half:last-child")?.classList.remove("hidden");
  $("chat-results").classList.remove("hidden");
  $("ask-idle")?.classList.add("hidden");
  $("ask-status").textContent = "";
  show("retry-btn", "copy-btn", "speak-btn", "new-chat-btn");
}

async function toggleAskHistoryPin(id, pinned) {
  await apiJson(`/ask-history/${id}/pin?pinned=${pinned}`, { method: "PUT" }).catch(() => null);
  loadAskHistoryPage(true);
}

async function deleteAskHistoryTurn(id) {
  // Permanent: no restore endpoint behind this one, unlike a note's bin.
  // "Clear all" right next to this already confirms; a single turn deleted
  // by the same one-click miss deserves the same guard, not less.
  if (!(await confirmDialog("Delete this question and answer?"))) return;
  await apiJson(`/ask-history/${id}`, { method: "DELETE" }).catch(() => null);
  loadAskHistoryPage(true);
  loadAskHistoryBadge();
}

async function clearAskHistory() {
  const ok = await confirmDialog(
    "Clear your question history?\n\nPinned questions are kept. This cannot be undone for the rest.",
    { confirmLabel: "Clear history", danger: true }
  );
  if (!ok) return;
  await apiJson("/ask-history", { method: "DELETE" }).catch(() => null);
  loadAskHistoryPage(true);
  loadAskHistoryBadge();
}
