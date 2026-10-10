// chat-edit.js: two rare paths moved out of chat.js on 2026-10-10 for the
// boot scripts' gzip ratchet (tests/test_static_compression.py): a question
// edited in place (the Edit button on your own message) and the copy
// fallback's dialog. Each caller fetches this file first (`lazyScript`, in
// chat-agent.js and `copyToClipboard`) and then calls it; not a
// `LAZY_MODULES` bundle, because app.js is at its own cap.

// Put a question back in the input so it can be tweaked and re-sent.
// Edit a question in place, the way you'd expect a chat to work.
//
// The old version just copied the text into the input box: the original
// question and its answer stayed put, and re-sending appended a second
// exchange below them. So a small correction left the thread showing the typo,
// the answer to the typo, and then the fix, which is the opposite of editing.
//
// Now the bubble itself becomes a textarea. Saving rewrites that question,
// drops every exchange after it (they were answers to the old wording), and
// asks again from that point.
function editAndResend(bubble, text) {
  if (chatController) return; // not mid-stream
  if (bubble.querySelector(".msg-edit")) return; // already editing
  const body = bubble.querySelector(".msg-body");
  const actions = bubble.querySelector(".msg-actions");
  const original = text;

  const editor = document.createElement("div");
  editor.className = "msg-edit";
  const box = document.createElement("textarea");
  box.value = original;
  box.rows = Math.min(8, Math.max(2, original.split("\n").length + 1));
  box.setAttribute("aria-label", "Edit your question");

  const hint = document.createElement("p");
  hint.className = "muted msg-edit-hint";
  hint.textContent =
    "Saving replaces this question and clears the replies that came after it.";

  const row = document.createElement("div");
  row.className = "row msg-edit-actions";
  const save = document.createElement("button");
  save.className = "small";
  save.textContent = "Save & resend";
  const cancel = document.createElement("button");
  cancel.className = "ghost small";
  cancel.textContent = "Cancel";
  row.append(save, cancel);
  editor.append(box, hint, row);

  const close = () => {
    editor.remove();
    body.classList.remove("hidden");
    actions?.classList.remove("hidden");
  };
  cancel.addEventListener("click", close);
  box.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      save.click();
    }
  });
  save.addEventListener("click", async () => {
    const edited = box.value.trim();
    if (!edited) return;
    if (edited === original) return close();

    const bubbles = [...$("chat-messages").querySelectorAll(".msg")];
    const turnIndex = Math.floor(bubbles.indexOf(bubble) / 2);

    // Server first: if this fails, nothing on screen has been thrown away yet.
    if (chatConv.id !== null) {
      try {
        const result = await apiJson(`/conversations/${chatConv.id}/truncate`, {
          method: "POST",
          body: JSON.stringify({ from_turn: turnIndex }),
        });
        if (result.conversation_deleted) chatConv.id = null;
      } catch (error) {
        toast(`Couldn't edit that: ${error.message}`, true);
        return;
      }
    }
    // Drop this bubble and everything after it, then ask again.
    for (const later of bubbles.slice(bubbles.indexOf(bubble))) later.remove();
    chatConv.turns = chatConv.turns.slice(0, turnIndex);
    close();
    loadConversationList();
    sendChatMessage(edited);
  });

  body.classList.add("hidden");
  actions?.classList.add("hidden");
  bubble.appendChild(editor);
  box.focus();
  box.setSelectionRange(box.value.length, box.value.length);
}

// The last resort: show the text, already selected, and say what to press.
// Reached when the browser refuses both copy mechanisms, usually a hardened
// or embedded webview. The text is still on screen and still selectable, so
// the answer to "how do I get this error out" is never "you can't".
function showCopyFallback(text) {
  const existing = $("copy-fallback");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "copy-fallback";
  overlay.className = "modal-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-label", "Copy this text");

  const card = document.createElement("div");
  card.className = "modal-card copy-fallback-card";

  const heading = document.createElement("h3");
  heading.textContent = "Copy this";

  const note = document.createElement("p");
  note.className = "muted";
  note.textContent =
    "This browser wouldn't let the app write to the clipboard, it's already " +
    "selected below, so press Ctrl+C (⌘C on a Mac).";

  const box = document.createElement("textarea");
  box.className = "copy-fallback-text";
  box.value = text;
  box.setAttribute("readonly", "");
  box.rows = 12;

  const close = document.createElement("button");
  close.className = "small";
  close.textContent = "Done";
  const dismiss = () => overlay.remove();
  close.addEventListener("click", dismiss);
  wireBackdropClose(overlay, () => dismiss());
  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Escape") dismiss();
  });

  card.append(heading, note, box, close);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  box.focus();
  box.select();
}
