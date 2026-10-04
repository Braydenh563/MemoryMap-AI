// note-history.js: one note's History, everything that ever happened to it
// with a way back to any of it. A lazy piece (app.js LAZY_MODULES), moved out
// of menus.js on 2026-10-03 (INBOX 432) to bring the boot scripts back under
// their gzip total: it runs only when History is chosen from a note's menu,
// and boot code reaches it through LAZY_ENTRY_POINTS. The words and the actor
// label it uses stay in menus.js, which the dashboard's feed shares.

async function openEntryHistory(entry) {
  const overlay = $("history-overlay");
  const list = $("history-list");
  $("history-status").textContent = "";
  $("history-status").classList.remove("error");
  list.replaceChildren();
  overlay.classList.remove("hidden");
  $("history-close").focus();

  let history;
  try {
    history = await apiJson(`/entries/${entry.id}/history`);
  } catch (error) {
    $("history-status").classList.add("error");
    $("history-status").textContent = error.message;
    return;
  }
  const events = history?.items || [];
  const revisions = history?.revisions || [];
  if (!events.length && !revisions.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "Nothing has happened to this note yet, so there's nothing to go back to.";
    list.appendChild(p);
    return;
  }

  const restoreTo = async (url, message) => {
    if (!(await confirmDialog("Replace the note with this version?\n\nThe current text is kept in the history, so this is undoable."))) return;
    try {
      await apiJson(url, { method: "POST" });
      overlay.classList.add("hidden");
      toast(message);
      await loadEntries();
      flashEntry(entry.id);
    } catch (error) {
      $("history-status").classList.add("error");
      $("history-status").textContent = error.message;
    }
  };

  // The current text first, so you can see what you'd be replacing.
  const current = document.createElement("div");
  current.className = "history-entry history-current";
  const currentHead = document.createElement("p");
  currentHead.className = "muted";
  currentHead.textContent = "Now";
  const currentBody = document.createElement("p");
  currentBody.textContent = notePreviewText(entry.content);
  current.append(currentHead, currentBody);
  list.appendChild(current);

  // The row every event renders as. A function rather than a loop body
  // because a second page of events is rendered by the same code, below.
  const eventRow = (item) => {
    const row = document.createElement("div");
    row.className = "history-entry";
    const head = document.createElement("p");
    head.className = "muted";
    head.textContent = `${HISTORY_ACTION_WORDS[item.action] || item.action} ${relativeTime(item.created_at)}`;
    head.title = new Date(item.created_at).toLocaleString(); // the exact time, on hover and to a reader
    const actor = historyActorLabel(item.actor);
    if (actor) {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = actor;
      head.append(" ", chip);
    }
    row.appendChild(head);
    //: A filing says where and who decided: "filed under Gym by
    //: granite4.1:3b, 82% sure" (manager.record_filing's `by`).
    if (item.action === "filed" && item.detail) {
      const who = document.createElement("p");
      who.className = "muted small";
      who.textContent = item.detail.charAt(0).toUpperCase() + item.detail.slice(1);
      row.appendChild(who);
    }
    if (item.compacted) {
      // The event is still a fact, its text is not kept: `events.compact`
      // drops the values behind changes older than the history window so the
      // log stops growing by a copy of the note on every edit. Saying that in
      // the row is the difference between a history with a gap and a history
      // that looks broken.
      const gone = document.createElement("p");
      gone.className = "muted";
      gone.textContent = "The text from this change is no longer kept.";
      row.appendChild(gone);
    } else if (item.content) {
      const body = document.createElement("p");
      body.textContent = notePreviewText(item.content);
      row.appendChild(body);
      // Only a version that differs from what is on screen is worth putting
      // back: offering "restore" on the state the note is already in reads as
      // a broken button rather than a safe one.
      if (item.content !== entry.content) {
        row.appendChild(
          smallButton("ph:arrow-u-up-left Put this back", "Restore this version", () =>
            restoreTo(`/entries/${entry.id}/restore/${item.id}`, "Earlier version restored.")
          )
        );
      }
    }
    return row;
  };

  // **Paging, and saying what is on screen.** `GET /entries/{id}/history`
  // returns at most `HISTORY_PAGE` (fifty) events and a `next_cursor` for
  // what is older than the oldest of them. This sheet used to read the first
  // page and drop the cursor, so a note edited more than fifty times showed
  // its newest fifty and looked like the whole history: silent truncation,
  // which is worse than a short list, because nothing on screen says the
  // rest exists and a version that is still there reads as lost. The row
  // below is both halves of the fix: it counts what is shown and it fetches
  // the next page.
  let shown = 0;
  let paged = false;  // whether "load older" has been pressed at least once
  let cursor = history?.next_cursor || null;

  // The control sits at the bottom of the events and stays there: the pages
  // that follow are inserted above it, so the list stays in newest-first
  // order however many times it is pressed.
  const more = document.createElement("div");
  more.className = "history-entry";

  const addEvents = (items) => {
    for (const item of items) {
      list.insertBefore(eventRow(item), more);
      shown += 1;
    }
  };

  const loadOlder = async () => {
    if (!cursor) return;
    const at = cursor;
    cursor = null;  // so a second press while this one is in flight is a no-op
    renderMore(true);
    let page;
    try {
      page = await apiJson(`/entries/${entry.id}/history?before=${at}`);
    } catch (error) {
      cursor = at;
      renderMore();
      $("history-status").classList.add("error");
      $("history-status").textContent = error.message;
      return;
    }
    addEvents(page?.items || []);
    paged = true;
    cursor = page?.next_cursor || null;
    renderMore();
  };

  const renderMore = (loading = false) => {
    more.replaceChildren();
    // A history that fits in one page says nothing extra: the row exists to
    // answer "is this all of it?", and on a note with a dozen changes the
    // list already answers that by ending.
    more.classList.toggle("hidden", !cursor && !loading && !paged);
    const note = document.createElement("p");
    note.className = "muted";
    if (cursor || loading) {
      // Plain about what it is: the count is what is on screen, not a
      // guess at the total, which the route does not send and which
      // counting would cost a second query to know.
      note.textContent = `Showing the ${shown} most recent changes to this note.`;
    } else if (paged) {
      note.textContent = `That is all ${shown} changes to this note.`;
    }
    more.appendChild(note);
    if (cursor) {
      more.appendChild(
        smallButton("ph:clock-counter-clockwise Load older changes", "Load the next page of this note's history", loadOlder)
      );
    } else if (loading) {
      const wait = document.createElement("p");
      wait.className = "muted";
      wait.textContent = "Loading older changes.";
      more.appendChild(wait);
    }
  };

  list.appendChild(more);
  addEvents(events);
  renderMore();

  // The snapshots are the same versions the events already show, one row
  // earlier, so they are only worth rendering for a note whose edits predate
  // the event log: measured on a note edited twice, both lists said "version
  // one of the note" and the sheet showed it twice.
  const snapshotsOnly = !events.some((item) => item.content);
  for (const revision of snapshotsOnly ? revisions : []) {
    const item = document.createElement("div");
    item.className = "history-entry";
    const head = document.createElement("p");
    head.className = "muted";
    head.textContent = `Before ${new Date(revision.created_at).toLocaleString()}`;
    const body = document.createElement("p");
    body.textContent = notePreviewText(revision.content);
    const restore = smallButton("ph:arrow-u-up-left Put this back", "Restore this version", () =>
      restoreTo(`/entries/${entry.id}/history/${revision.id}/restore`, "Earlier version restored.")
    );
    item.append(head, body, restore);
    list.appendChild(item);
  }
}
