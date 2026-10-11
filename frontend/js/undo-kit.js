// The undo kit (INBOX 898, undo everywhere), loaded on the first act that
// needs it (`LAZY_MODULES.undoKit`, app.js) so the boot scripts stay inside
// their gzip budget. Each helper puts one step on the stack through
// `pushUndo` (status.js), the one contract (tests/test_undo_contract.py); the
// writes it covers are held to it by tests/test_undo_coverage.py. A caller
// that reads the returned step awaits it, because until this file has loaded
// the name is a stand-in that answers a promise.

//: **A note this act made** (INBOX 898, undo everywhere): Undo bins it, Redo
//: brings it back. The one shape every "save as a note" path uses, so a note
//: made from a chat answer, a web page, the graph or a wiki link is as
//: reversible as one typed into Capture.
function pushEntryCreateUndo(entry, label = "Created a note") {
  const id = entry?.id;
  if (!id) return null;
  return pushUndo(
    label,
    async () => {
      await api(`/entries/${id}`, { method: "DELETE" });
      await refreshEntries([id]);
    },
    async () => {
      await api(`/entries/${id}/restore`, { method: "POST" });
      await refreshEntries([id]);
    }
  );
}

//: **A link this act made** (INBOX 898): Undo removes that very link by its
//: id (a pair can be linked twice by different routes, and guessing is how an
//: undo deletes the wrong one), Redo makes it again and keeps the new id.
//: `made` is the server's answer to the POST, `body` what was posted.
function pushLinkCreateUndo(sourceId, targetId, made, body, label = "Linked two notes", after) {
  let liveId = made?.links?.find((link) => link.entry_id === targetId)?.link_id ?? null;
  const settle = async () => {
    await refreshEntries([sourceId, targetId]).catch(() => {});
    await after?.();
  };
  return pushUndo(
    label,
    async () => {
      if (liveId == null) return;
      await api(`/entries/${sourceId}/links/${liveId}`, { method: "DELETE" });
      await settle();
    },
    async () => {
      const redone = await apiJson(`/entries/${sourceId}/links`, { method: "POST", body: JSON.stringify(body) });
      liveId = redone?.links?.find((link) => link.entry_id === targetId)?.link_id ?? liveId;
      await settle();
    }
  );
}

//: **Any write whose inverse is the same request with the old value** (INBOX
//: 898): a rename, a pin, a colour, a move, a flag. `before` and `after` are
//: the two request bodies; `refresh` repaints whatever showed it.
function pushRequestUndo(label, path, method, before, after, refresh) {
  const send = async (body) => {
    await api(path, { method, body: JSON.stringify(body) });
    await refresh?.();
  };
  return pushUndo(label, () => send(before), () => send(after));
}

//: **Several notes written at once** (a bulk tag, a bulk move, a bulk flag):
//: one step on the stack that puts each note's own fields back. `changes` is
//: `[{ id, before, after }]` with the PUT bodies.
function pushEntriesPutUndo(label, changes, after) {
  const putEach = async (key) => {
    for (const change of changes) await api(`/entries/${change.id}`, { method: "PUT", body: JSON.stringify(change[key]) });
    await refreshEntries(changes.map((change) => change.id)).catch(() => {});
    await after?.();
  };
  return pushUndo(label, () => putEach("before"), () => putEach("after"));
}

//: **A bin and its restore** (INBOX 898): `restored` says which way the act
//: went. Putting something back from the bin is undone by binning it again,
//: and binning is undone by putting it back, so one helper serves both.
function pushBinPairUndo(label, binPath, restorePath, restored, refresh) {
  const bin = async () => {
    await api(binPath, { method: "DELETE" });
    await refresh?.();
  };
  const restore = async () => {
    await api(restorePath, { method: "POST" });
    await refresh?.();
  };
  return restored ? pushUndo(label, bin, restore) : pushUndo(label, restore, bin);
}

//: **Two routes that undo each other** (archive and unarchive, pin and unpin,
//: hide and show): `back` and `again` are `[path, method]` pairs, or lists of
//: them for a bulk act.
function pushRoutePairUndo(label, back, again, refresh) {
  const run = (routes) => async () => {
    const list = Array.isArray(routes[0]) ? routes : [routes];
    for (const [path, method] of list) await api(path, { method });
    await refresh?.();
  };
  return pushUndo(label, run(back), run(again));
}

//: **Accepting a contradiction makes a `contradicts` link** and the server
//: does not say which row: Undo reads the earlier note, finds that link by
//: its other end and kind, and removes it; Redo accepts the pair again.
function pushTensionLinkUndo(earlierId, laterId) {
  return pushUndo(
    "Linked two notes as contradicting",
    async () => {
      const note = await apiJson(`/entries/${earlierId}`);
      const link = (note.links || []).find((l) => l.entry_id === laterId && l.link_type === "contradicts");
      if (link) await api(`/entries/${earlierId}/links/${link.link_id}`, { method: "DELETE" });
      await refreshEntries([earlierId, laterId]).catch(() => {});
    },
    async () => {
      await apiJson("/entries/tensions/accept", { method: "POST", body: JSON.stringify({ earlier_id: earlierId, later_id: laterId }) });
      await refreshEntries([earlierId, laterId]).catch(() => {});
    }
  );
}
