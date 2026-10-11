// standalone-undo.js: Undo and Redo for the two stand-alone windows
// (capture.html and clip.html), INBOX 898 ("absolutely everything").
//
// These windows have no undo stack of their own and are often opened beside
// the app. So a note they save is first announced on a BroadcastChannel; the
// app window, when it is open, puts it on its own stack (quick-note.js) and
// answers, and the stand-alone window can close as it always did. When nothing
// answers (the app is closed, only the server is running) the window stays
// open with its own Undo button, which is Redo once pressed.

(() => {
  const CHANNEL = "memorymap-undo";

  //: Resolves true when an app window took the note onto its stack.
  function announce(made, label) {
    return new Promise((resolve) => {
      let channel;
      try {
        channel = new BroadcastChannel(CHANNEL);
      } catch {
        resolve(false);
        return;
      }
      const finish = (taken) => {
        clearTimeout(timer);
        channel.close();
        resolve(taken);
      };
      const timer = setTimeout(() => finish(false), 500);
      channel.onmessage = (event) => {
        if (event.data?.type === "note-made-ack" && event.data.id === made.id) finish(true);
      };
      channel.postMessage({ type: "note-made", id: made.id, label });
    });
  }

  //: An Undo button in `row` for the note `id`: it bins the note, and turns
  //: into Redo, which brings it back. `send(path, method)` is the window's own
  //: request, which carries the sign-in and the space.
  function offer({ id, send, status, row }) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ghost small";
    button.textContent = "Undo";
    let binned = false;
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        const response = await send(`/entries/${id}${binned ? "/restore" : ""}`, binned ? "POST" : "DELETE");
        if (!response.ok) throw new Error("Couldn't do that.");
        binned = !binned;
        button.textContent = binned ? "Redo" : "Undo";
        status(binned ? "Taken back. Redo puts it back." : "Put back in your notes.");
      } catch (error) {
        status(error.message || "Couldn't do that.", true);
      } finally {
        button.disabled = false;
      }
    });
    row.appendChild(button);
  }

  window.standaloneUndo = { announce, offer };
})();
