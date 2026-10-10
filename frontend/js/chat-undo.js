// The chat's undo helpers (CHAT_PLAN 8 row 5, decision 53), loaded by
// `chatUndo` in chat-attach.js on the first chat write.
//: **Every chat write is on the undo bar** (CHAT_PLAN 8 row 5, decision 53):
//: a rename, a pin, an archive, a fork, a saved document and a deleted
//: message each name their own inverse, and the list repaints both ways.
function chatRepaint(step) {
  return async () => {
    await step();
    loadConversationList();
  };
}

function chatPut(path, body) {
  return apiJson(`/conversations/${path}`, { method: "PUT", ...(body ? { body: JSON.stringify(body) } : {}) });
}

function chatTitleUndo(id, before, after) {
  const name = (title) => async () => {
    await chatPut(id, { title });
    if (chatConv?.id === id) $("chat-title").textContent = title;
  };
  pushUndo(`Renamed the chat to “${after}”`, chatRepaint(name(before)), chatRepaint(name(after)));
}

function chatPinUndo(id, pinned) {
  const pin = (to) => chatRepaint(() => chatPut(`${id}/pin`, { pinned: to }));
  pushUndo(pinned ? "Pinned a chat" : "Unpinned a chat", pin(!pinned), pin(pinned));
}

function chatArchiveUndo(id, title) {
  pushUndo(`Archived “${title}”`, chatRepaint(() => chatPut(`${id}/unarchive`)), chatRepaint(() => chatPut(`${id}/archive`)));
}

//: A fork is a new chat, so its undo deletes it and keeps the row the DELETE
//: answers with, which is what its redo sends back.
function chatForkUndo(fork) {
  let row = null;
  pushUndo(
    `Forked to “${fork.title}”`,
    chatRepaint(async () => {
      row = (await apiJson(`/conversations/${fork.id}`, { method: "DELETE" })).restore;
      if (chatConv?.id === fork.id) newChatConversation();
    }),
    chatRepaint(() => apiJson("/conversations/restore", { method: "POST", body: JSON.stringify(row) }))
  );
}

function chatDocumentUndo(doc) {
  pushUndo(
    `Saved “${doc.title}” to your documents`,
    () => apiJson(`/documents/${doc.id}`, { method: "DELETE" }),
    () => apiJson(`/documents/${doc.id}/restore`, { method: "POST" })
  );
}

//: A deleted message comes back at its own place: the DELETE answers with the
//: pair it removed (`POST .../turns/{i}/restore`), or, when it was the chat's
//: last, with the whole row. The open chat is reread either way.
function chatTurnUndo(id, index, gone) {
  const reopen = () => (chatConv?.id === id || chatConv?.id === null ? openConversation(id) : null);
  const back = gone.conversation_deleted
    ? () => apiJson("/conversations/restore", { method: "POST", body: JSON.stringify(gone.restore) })
    : () => apiJson(`/conversations/${id}/turns/${index}/restore`, { method: "POST", body: JSON.stringify({ messages: gone.removed }) });
  offerUndo(
    "Deleted a message",
    "Message deleted.",
    async () => { await back(); await reopen(); loadConversationList(); },
    async () => {
      await apiJson(`/conversations/${id}/turns/${index}`, { method: "DELETE" });
      if (chatConv?.id === id) await (gone.conversation_deleted ? newChatConversation() : openConversation(id));
      loadConversationList();
    }
  );
}
