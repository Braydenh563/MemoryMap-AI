// quick-note.js: Quick note, and the outbox every note box shares (INBOX 434,
// the owner: "make the note filing and how the user can make notes the
// fastest, most reliable and easiest thing to use the user has ever seen").
//
// A lazy piece (app.js `LAZY_MODULES.quickNote`), fetched a few seconds after
// boot rather than on first use, and that timing is load-bearing: the outbox
// is for the moment the server has gone away, which is exactly when a script
// can no longer be fetched. Boot code reaches it through
// `LAZY_ENTRY_POINTS`, so a call made before it arrives loads it.
//
// Two things live here:
//
// 1. **The outbox.** A note saved while the server is not answering (the
//    fetch itself threw: refused, reset, offline) is kept in this browser's
//    storage and sent again when the server is back: on `noteServerUp`
//    (status.js), every fifteen seconds while anything is waiting, and when
//    this file loads. Measured before (captureaudit.js, server down mid-save):
//    the composer said "Failed to fetch", kept the text, and nothing ever
//    sent it. Each note carries a `client_key`, so a resend of a save whose
//    answer was lost on the way back is answered with the note the first
//    send made (routes_entries.py `_already_delivered`), not a second copy.
// 2. **Quick note.** Alt+N (or the palette) from any tab opens a small dialog
//    that saves without leaving the page, the way Drafts, Tana and Bear's
//    quick entry do. Ctrl+Enter saves, `#word` tags, Escape closes and keeps
//    the words for next time, "Open in Capture" carries them to the full
//    composer (title, category, files, templates). A plain textarea rather
//    than the live editor: the editor arrives with the Library bundle, and a
//    popup whose point is speed must not wait on 1.7 MB.

const NOTE_OUTBOX_KEY = "noteOutbox";
const QUICK_NOTE_DRAFT_KEY = "quickNoteDraft";
const NOTE_OUTBOX_RETRY_MS = 15000;

function noteOutbox() {
  try {
    const list = JSON.parse(localStorage.getItem(NOTE_OUTBOX_KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

//: Answers whether the list was written: a full or blocked storage is the
//: one case the outbox cannot help, and the caller then keeps the words on
//: screen instead of clearing them.
function writeNoteOutbox(list) {
  try {
    if (list.length) localStorage.setItem(NOTE_OUTBOX_KEY, JSON.stringify(list));
    else localStorage.removeItem(NOTE_OUTBOX_KEY);
  } catch {
    return false;
  }
  renderNoteOutbox();
  return true;
}

function newNoteClientKey() {
  return `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

//: The server is gone, rather than answering no: `fetch` itself threw.
function noteServerGone(error) {
  return error instanceof TypeError;
}

//: Hold a note for later. Answers whether it is held.
function noteOutboxAdd(body) {
  const list = noteOutbox();
  list.push({ ...body, client_key: body.client_key || newNoteClientKey(), queued_at: Date.now() });
  const held = writeNoteOutbox(list);
  scheduleNoteOutboxFlush();
  return held;
}

//: Save a note, or hold it when the server is gone. Answers `{ saved }` or
//: `{ queued: true }`; a refusal (a 4xx, a 5xx) is thrown as it would be.
async function createNoteSafely(body) {
  const payload = { defer_filing: true, inline_tags: true, ...body };
  payload.client_key = payload.client_key || newNoteClientKey();
  try {
    return { saved: await apiJson("/entries", { method: "POST", body: JSON.stringify(payload) }) };
  } catch (error) {
    if (!noteServerGone(error) || !noteOutboxAdd(payload)) throw error;
    return { queued: true };
  }
}

let noteOutboxTimer = 0;
let noteOutboxFlushing = null;

function scheduleNoteOutboxFlush() {
  clearTimeout(noteOutboxTimer);
  if (noteOutbox().length) noteOutboxTimer = setTimeout(flushNoteOutbox, NOTE_OUTBOX_RETRY_MS);
}

//: Send every held note, oldest first. Stops at the first sign the server is
//: still gone (or the notebook is locked) and tries again later; one at a
//: time, so a resend can never race itself.
function flushNoteOutbox() {
  if (noteOutboxFlushing) return noteOutboxFlushing;
  if (!noteOutbox().length || !authToken()) return Promise.resolve(0);
  noteOutboxFlushing = (async () => {
    let sent = 0;
    for (const item of noteOutbox()) {
      const { queued_at: _queuedAt, ...payload } = item;
      try {
        const saved = await apiJson("/entries", { method: "POST", body: JSON.stringify(payload), silent: true });
        writeNoteOutbox(noteOutbox().filter((held) => held.client_key !== item.client_key));
        sent += 1;
        if (saved.filing_state === "pending") watchFiling(saved, { quiet: true });
      } catch (error) {
        if (noteServerGone(error) || error.isLockout || !error.status || error.status >= 500 || error.status === 429) break;
        //: Answered and refused (a note over the size cap, say): resending
        //: would be refused forever, so the words go back where they can be
        //: fixed, Capture's box, after anything already in it.
        writeNoteOutbox(noteOutbox().filter((held) => held.client_key !== item.client_key));
        returnNoteToCapture(payload.content, error.message);
      }
    }
    if (sent) {
      toast(sent === 1 ? "The note kept on this device is in your notebook now." : `The ${sent} notes kept on this device are in your notebook now.`);
      loadEntries().catch(() => {});
    }
    return sent;
  })().finally(() => {
    noteOutboxFlushing = null;
    scheduleNoteOutboxFlush();
  });
  return noteOutboxFlushing;
}

function returnNoteToCapture(content, reason) {
  const box = $("entry-content");
  if (!box || !content) return;
  box.value = box.value.trim() ? `${box.value}\n\n${content}` : content;
  box.dispatchEvent(new Event("input", { bubbles: true }));
  toastAction(`A note kept on this device was refused (${reason}). It is back in Capture.`, "Open Capture", () => startNewNote());
}

//: One notice above the Capture box while anything is held, with a way to
//: try now rather than wait out the timer.
function renderNoteOutbox() {
  const notice = $("note-outbox-notice");
  if (!notice) return;
  const count = noteOutbox().length;
  notice.classList.toggle("hidden", !count);
  if (!count) return;
  const text = notice.querySelector(".note-outbox-text");
  setLabel(
    text,
    `ph:cloud-slash ${count === 1 ? "1 note is" : `${count} notes are`} kept on this device until the server answers.`,
  );
}

// --- Quick note --------------------------------------------------------------

function quickNoteBox() {
  return $("quick-note-text");
}

function quickNoteStatus(text, error = false) {
  const status = $("quick-note-status");
  status.textContent = text;
  status.classList.toggle("error", error);
}

function openQuickNote() {
  const dialog = $("quick-note");
  if (!dialog) return;
  const box = quickNoteBox();
  if (!dialog.open) {
    let draft = "";
    try {
      draft = localStorage.getItem(QUICK_NOTE_DRAFT_KEY) || "";
    } catch {
      draft = "";
    }
    if (!box.value) box.value = draft;
    const held = noteOutbox().length;
    quickNoteStatus(
      held
        ? `${held === 1 ? "1 note is" : `${held} notes are`} waiting for the server on this device.`
        : draft
          ? "Your unsaved words are back."
          : "",
    );
    dialog.showModal();
  }
  box.focus();
  box.setSelectionRange(box.value.length, box.value.length);
}

function keepQuickNoteDraft() {
  try {
    const text = quickNoteBox().value;
    if (text.trim()) localStorage.setItem(QUICK_NOTE_DRAFT_KEY, text);
    else localStorage.removeItem(QUICK_NOTE_DRAFT_KEY);
  } catch {
    // Storage blocked: the words are still in the box while it is open.
  }
}

function clearQuickNote() {
  quickNoteBox().value = "";
  keepQuickNoteDraft();
}

let quickNoteSaving = false;

async function saveQuickNote() {
  if (quickNoteSaving) return;
  const content = quickNoteBox().value.trim();
  if (!content) {
    quickNoteStatus("Write something first, then save.", true);
    return;
  }
  quickNoteSaving = true;
  const button = $("quick-note-save");
  button.disabled = true;
  quickNoteStatus("Saving…");
  try {
    const result = await createNoteSafely({ content, tags: [] });
    clearQuickNote();
    $("quick-note").close();
    if (result.queued) {
      toast("Saved on this device. It goes into your notebook as soon as the server answers.");
      return;
    }
    const saved = result.saved;
    toastAction(
      saved.filing_state === "pending" ? "Saved. Filing it now." : `Filed under “${saved.category}”.`,
      "Go to it",
      () => flashEntry(saved.id),
    );
    //: In the list now, not when filing settles: measured, 2 to 4 s later
    //: on every tab but the dashboard when this waited on the watch.
    loadEntries().catch(() => {});
    if (saved.filing_state === "pending") watchFiling(saved);
    pushUndo(
      "Created a note",
      async () => {
        await api(`/entries/${saved.id}`, { method: "DELETE" });
        await loadEntries();
      },
      async () => {
        await api(`/entries/${saved.id}/restore`, { method: "POST" });
        await loadEntries();
      },
    );
  } catch (error) {
    //: Refused or failed and not held: the words stay in the box (and in
    //: storage, from the last keystroke), with the reason under them.
    quickNoteStatus(error.message, true);
  } finally {
    quickNoteSaving = false;
    button.disabled = false;
  }
}

//: The full composer, for a note that has outgrown the popup: the words move
//: (after anything Capture already holds) and the popup's copy is cleared.
function quickNoteToCapture() {
  const text = quickNoteBox().value;
  $("quick-note").close();
  startNewNote();
  if (!text.trim()) return;
  const box = $("entry-content");
  box.value = box.value.trim() ? `${box.value}\n\n${text}` : text;
  box.dispatchEvent(new Event("input", { bubbles: true }));
  clearQuickNote();
}

(() => {
  const box = quickNoteBox();
  if (!box) return;
  box.addEventListener("input", () => {
    keepQuickNoteDraft();
    if ($("quick-note-status").classList.contains("error")) quickNoteStatus("");
  });
  box.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && !event.isComposing) {
      event.preventDefault();
      saveQuickNote();
    }
  });
  $("quick-note-save").addEventListener("click", saveQuickNote);
  $("quick-note-more").addEventListener("click", quickNoteToCapture);
  $("quick-note-close").addEventListener("click", () => $("quick-note").close());
  $("note-outbox-retry")?.addEventListener("click", () => flushNoteOutbox());
  //: Back on the network the browser knows about (a laptop's wifi), as well
  //: as the server answering again.
  window.addEventListener("online", () => flushNoteOutbox());
  renderNoteOutbox();
  flushNoteOutbox();
})();
