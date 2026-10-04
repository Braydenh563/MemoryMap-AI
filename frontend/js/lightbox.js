// lightbox.js: re-evaluate, inline actions, attachments, the lightbox, the
// selection popup's state. Moved out of app.js on 2026-09-26 as one contiguous
// range (INBOX 426 cc, docs/roadmap/agent-remaining/appjs-split.md). A classic
// script sharing app.js's globals, loaded in app.js's old order; nothing in an
// earlier file calls into it while the page loads (scratchpad/appjs-map.js
// --check).

// The Add context / continue / remind boxes inside an entry card.
// Ask the AI to re-evaluate one note, then show its suggestions inline.
async function reevaluateEntry(entry) {
  closeActionMenus();
  toast("Atlas is reading this note…");
  // Show a spinner on this exact card while the AI works.
  busyEntryId = entry.id;
  renderEntries();
  try {
    const result = await apiJson(`/entries/${entry.id}/reevaluate`, { method: "POST" });
    // If the confidence actually changed, flash the badge on the next render.
    const newConfidence = result.entry ? result.entry.ai_confidence : null;
    if (newConfidence !== null && newConfidence !== entry.ai_confidence) {
      flashConfidenceId = entry.id;
    }
    inlineAction = { id: entry.id, kind: "reevaluate", data: result };
    busyEntryId = null;
    await loadEntries(); // reflect the refreshed confidence/category, then show suggestions
  } catch (error) {
    busyEntryId = null;
    renderEntries();
    toast(error.message || "Atlas could not read this note.", true);
  }
}

// The inline result of a re-evaluate: new confidence, plus tag and link
// suggestions the user applies with a click (nothing is applied on its own).
function renderReevaluateResult(entry, wrap) {
  const data = inlineAction.data;
  const confidence = data.entry ? data.entry.ai_confidence : entry.ai_confidence;

  const head = document.createElement("p");
  head.className = "muted";
  head.textContent = data.recategorised_to
    ? `Read: confidence ${confidence}%, moved to “${data.recategorised_to}”.`
    : `Read: confidence now ${confidence}%.`;
  wrap.appendChild(head);

  // Drop suggestions the user already applied (the card re-renders after each).
  const haveTags = new Set(entry.tags);
  const linkedIds = new Set((entry.links || []).map((l) => l.entry_id));
  const tags = (data.suggested_tags || []).filter((t) => !haveTags.has(t));
  const links = (data.suggested_links || []).filter((l) => !linkedIds.has(l.id));

  if (tags.length) {
    const tagRow = document.createElement("div");
    tagRow.className = "recent";
    const label = document.createElement("span");
    label.className = "muted";
    label.textContent = "Add tags:";
    tagRow.appendChild(label);
    for (const tag of tags) {
      const tagChip = chip(`ph:plus ${tag}`, "tag", async () => {
        try {
          await api(`/entries/${entry.id}`, {
            method: "PUT",
            body: JSON.stringify({ tags: [...entry.tags, tag] }),
          });
          tagChip.remove();
          toast(`Tagged “${tag}”.`);
          loadEntries();
        } catch (error) {
          toast(error.message, true);
        }
      });
      tagChip.title = `Add the “${tag}” tag`;
      tagRow.appendChild(tagChip);
    }
    wrap.appendChild(tagRow);
  }

  if (links.length) {
    const label = document.createElement("p");
    label.className = "muted";
    label.textContent = "Link to related notes:";
    wrap.appendChild(label);
    for (const link of links) {
      const row = document.createElement("div");
      row.className = "row space-between reevaluate-link";
      const preview = document.createElement("span");
      renderInlineMarkdown(preview, link.preview, [], true);
      row.appendChild(preview);
      row.appendChild(
        smallButton("ph:link Link", "Link these two notes", async () => {
          try {
            const updated = await apiJson(`/entries/${entry.id}/links`, {
              method: "POST",
              body: JSON.stringify({ target_id: link.id }),
            });
            row.remove();
            toast("Notes linked.");
            loadEntries();
            let liveLinkId = updated.links.find((l) => l.entry_id === link.id)?.link_id;
            pushUndo(
              "Linked two notes",
              async () => {
                if (liveLinkId == null) return;
                await api(`/entries/${entry.id}/links/${liveLinkId}`, { method: "DELETE" });
                await loadEntries();
              },
              async () => {
                const redone = await apiJson(`/entries/${entry.id}/links`, {
                  method: "POST",
                  body: JSON.stringify({ target_id: link.id }),
                });
                liveLinkId = redone.links.find((l) => l.entry_id === link.id)?.link_id ?? liveLinkId;
                await loadEntries();
              }
            );
          } catch (error) {
            toast(error.message, true);
          }
        })
      );
      wrap.appendChild(row);
    }
  }

  if (!tags.length && !links.length) {
    const none = document.createElement("p");
    none.className = "muted";
    none.textContent = "No new tags or links to suggest right now.";
    wrap.appendChild(none);
  }

  wrap.appendChild(
    smallButton("Done", "Close", () => {
      inlineAction = null;
      renderEntries();
    })
  );
}

function renderInlineAction(entry) {
  const wrap = document.createElement("div");
  wrap.className = "inline-action";

  if (inlineAction.kind === "reevaluate") {
    renderReevaluateResult(entry, wrap);
    return wrap;
  }

  if (inlineAction.kind === "document") {
    renderAttachToDocument(entry, wrap);
    return wrap;
  }

  if (inlineAction.kind === "board") {
    renderAttachToBoard(entry, wrap);
    return wrap;
  }

  if (inlineAction.kind === "remind") {
    const shown = stripFrontmatter(entry.content).trim();
    const preview = shown.length > 40 ? shown.slice(0, 39) + "…" : shown;
    const textInput = document.createElement("input");
    textInput.type = "text";
    textInput.value = `Follow up: ${preview}`;
    const dueInput = document.createElement("input");
    dueInput.type = "datetime-local";
    dueInput.value = defaultDueValue();
    const row = document.createElement("div");
    row.className = "row";
    row.appendChild(
      smallButton("Set reminder", "", async () => {
        if (await addReminder(textInput.value.trim(), dueInput.value, entry.id)) {
          inlineAction = null;
          renderEntries();
        }
      }, false)
    );
    row.appendChild(
      smallButton("Cancel", "", () => {
        inlineAction = null;
        renderEntries();
      })
    );
    wrap.append(textInput, dueInput, row);
    setTimeout(() => textInput.focus(), 0);
    return wrap;
  }

  const isContext = inlineAction.kind === "context";

  const textarea = document.createElement("textarea");
  textarea.rows = 2;
  textarea.placeholder = isContext
    ? "Add detail: Atlas re-reads the whole note and may refile it…"
    : "Continue this train of thought…";
  wrap.appendChild(textarea);

  const row = document.createElement("div");
  row.className = "row";
  row.appendChild(
    smallButton(
      isContext ? "Add context" : "Add to thread",
      "",
      async () => {
        const text = textarea.value.trim();
        if (!text) return;
        try {
          if (isContext) {
            const updated = await apiJson(`/entries/${entry.id}/context`, {
              method: "POST",
              body: JSON.stringify({ text }),
            });
            toast(
              updated.category === entry.category
                ? `Context added: still filed under “${updated.category}”.`
                : `Context added: refiled under “${updated.category}”.`
            );
          } else {
            await apiJson("/entries", {
              method: "POST",
              body: JSON.stringify({ content: text, parent_id: entry.id }),
            });
            toast("Thread continued.");
          }
          inlineAction = null;
          await loadEntries();
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
  wrap.appendChild(row);
  setTimeout(() => textarea.focus(), 0);
  return wrap;
}

function attachFileTo(entry) {
  const input = document.createElement("input");
  input.type = "file";
  // The backend already accepts one attachment per POST and a note already
  // renders any number of them, the only thing missing was the picker
  // itself only ever taking `files[0]`, silently dropping a multi-select.
  input.multiple = true;
  input.addEventListener("change", async () => {
    const files = [...input.files];
    if (!files.length) return;
    let failures = 0;
    for (const file of files) {
      const form = new FormData();
      form.append("file", file);
      // Raw fetch: multipart must NOT get the JSON content-type header.
      const response = await fetch(`/entries/${entry.id}/files`, {
        method: "POST",
        // X-Workspace-ID alongside X-Auth-Token: a raw fetch (multipart body,
        // so it cannot go through api()/apiJson()) does not get either header
        // for free the way every JSON call in this file does.
        headers: { "X-Auth-Token": authToken(), "X-Workspace-ID": activeSpaceId() },
        body: form,
      });
      if (!response.ok) {
        failures++;
        const detail = await response.json().catch(() => ({}));
        toast(plainHttpError(response.status, detail.detail, `${file.name}: the upload did not work. Try again.`), true);
      }
    }
    const attached = files.length - failures;
    if (attached > 0) {
      toast(attached === 1 ? `Attached ${files[0].name}.` : `Attached ${attached} files.`);
    }
    await loadEntries();
  });
  input.click();
}

// The Library's other half of "upload directly, attach later", asked for
// directly. `attachFileTo` above always opens a fresh disk picker; this
// instead offers whatever already lives in the Library's image/PDF gallery
// (MediaUpload: GET /media), so an image uploaded once doesn't need
// re-uploading onto every note that wants it. Note attachments (Attachment,
// PDFs, docs, audio: attachFileTo's own domain) have no "floating, not yet
// attached to anything" state to pick from, so this is images/PDFs only,
// same as the Library gallery itself.
async function attachFromLibrary(entry) {
  const images = await apiJson("/media", { silent: true }).catch(() => null);
  if (!images) {
    toast("Couldn't load the Library gallery.", true);
    return;
  }
  if (!images.length) {
    toast("Nothing in the Library gallery yet, upload one from Library → Files & Images first.", true);
    return;
  }

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay library-attach-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Attach from Library");

  const card = document.createElement("div");
  card.className = "card modal-card";
  const head = document.createElement("div");
  head.className = "row space-between library-head";
  const title = document.createElement("h2");
  title.textContent = "Attach from Library";
  const close = document.createElement("button");
  close.type = "button";
  close.className = "ghost small";
  close.setAttribute("aria-label", "Close");
  setLabel(close, "ph:x");
  head.append(title, close);
  const hint = document.createElement("p");
  hint.className = "muted";
  hint.textContent = "Pick an image or PDF already in the Library to attach it to this note.";
  const grid = document.createElement("div");
  grid.className = "library-image-grid library-attach-grid";

  const done = () => {
    document.removeEventListener("keydown", onKey, true);
    overlay.remove();
  };
  const onKey = (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      done();
    }
  };
  close.addEventListener("click", done);
  wireBackdropClose(overlay, () => done());
  document.addEventListener("keydown", onKey, true);

  const isPdf = (url) => /\.pdf$/i.test(url);
  for (const image of images) {
    const fig = document.createElement("figure");
    fig.className = "library-image-tile";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "library-attach-pick";
    button.title = `Attach “${image.original_name}”`;
    if (isPdf(image.url)) {
      const icon = document.createElement("i");
      icon.className = "ph ph-file-pdf";
      icon.setAttribute("aria-hidden", "true");
      button.appendChild(icon);
    } else {
      const img = document.createElement("img");
      img.src = mediaSrc(image.url);
      img.alt = "";
      img.loading = "lazy";
      button.appendChild(img);
    }
    button.addEventListener("click", async () => {
      const markdown = isPdf(image.url)
        ? `[${image.original_name}](${image.url})\n`
        : `![${image.original_name}](${image.url})\n`;
      const nextContent = `${entry.content.trim()}\n\n${markdown}`.trim();
      try {
        await apiJson(`/entries/${entry.id}`, {
          method: "PUT",
          body: JSON.stringify({ content: nextContent }),
        });
        toast(`Attached ${image.original_name}.`);
        done();
        await loadEntries();
        pushEntryPutUndo(
          entry.id,
          `Attached ${image.original_name}`,
          { content: entry.content },
          { content: nextContent }
        );
      } catch (error) {
        toast(error.message || "Couldn't attach that file.", true);
      }
    });
    const cap = document.createElement("figcaption");
    cap.textContent = image.original_name;
    cap.title = image.original_name;
    fig.append(button, cap);
    grid.appendChild(fig);
  }

  card.append(head, hint, grid);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  close.focus();
}

// Thumbnails need the auth header, which <img src> can't send: fetch
// the bytes once per attachment and cache an object URL (Wave M).
const thumbUrlCache = new Map();

async function attachmentObjectUrl(attachment) {
  if (thumbUrlCache.has(attachment.id)) return thumbUrlCache.get(attachment.id);
  const response = await api(`/files/${attachment.id}`);
  const url = URL.createObjectURL(await response.blob());
  thumbUrlCache.set(attachment.id, url);
  return url;
}

//: **Who wrote a caption, in words** (the owner, 2026-09-24). `caption_model` names the
//: author of a caption: a vision or utility model, or `APP_CAPTION_AUTHOR`
//: when the app wrote it itself (a board export's "Part of the mind map ...,
//: exported from MemoryMap", stored with `source: "app"` by routes_files.py).
//: That one is "Written by", not "Described by": nothing looked at the
//: picture. The lightbox byline and the Library card both read this, so the
//: same picture says the same thing in both places. `short` is the Library
//: card's own shortener for a long model name.
const APP_CAPTION_AUTHOR = "MemoryMap";
function captionCredit(model, short = (name) => name) {
  return model === APP_CAPTION_AUTHOR
    ? `Written by ${APP_CAPTION_AUTHOR}`
    : `Described by ${short(model)}`;
}

// `openLightbox`, the viewer itself, is in lightbox-view.js and loads on the
// first open (app.js, `LAZY_MODULES.lightbox`); see that file's header.

// A small kebab (⋯) near whatever the user just selected, anywhere in the
// app's actual content: a document, the graph, a web search result, a chat
// message, a note. Asked for directly: "if the user highlights an output or
// piece of text... the user can save it as a note, search the notebook for
// similar phrases or meaning/topics, ask the ai about it".
//
// **It used to be three flat buttons, and the shape was the problem.** Asked
// for directly, second time round: "a kebab 3-dot button which when clicked on
// shows the Popup buttons within the application window". Three things go
// wrong with a bar that is always open, and all three are fixed by a kebab:
//
//   1. **It ran off the screen.** The old clamp was
//      `Math.min(Math.max(margin, left), innerWidth - width - margin)`. When
//      the bar is wider than the viewport the upper bound is *smaller* than
//      the lower bound, so `Math.min` wins and `left` goes negative. The bar
//      could not wrap (`white-space: nowrap`, no `flex-wrap`) and its three
//      labels ran to ~50 characters, comfortably wider than a 360px phone.
//      The clamp below is written the other way round, so a box too wide to
//      fit pins to the margin instead of hanging off the left edge.
//   2. **It covered the thing you had just selected.** A 28px dot does not.
//   3. **Three actions was the ceiling.** The app's richest capture surface
//      offered less than a note card's own ⋯ menu. A menu has room, so this
//      is now where a selection can become a note, a draft, an addition to an
//      existing note, several linked notes, a reminder, or a question.
//
// Denylist rather than an allowlist of containers: excluding form fields
// (which already have their own selection/context-menu behaviour a popup
// stealing focus would fight) and the popup's own text is simpler than
// naming every readable surface in the app and it can't silently miss one
// that gets added later.
//: Overlays are out too: the Finder, the palette and a dialog are about the
//: thing they show, and a popup offering to turn their text into a note
//: would sit over the controls a person is using.
const SELECTION_POPUP_EXCLUDED =
  "input, textarea, [contenteditable], .selection-popup, .lock-overlay, .modal-overlay, .command-palette";

let selectionPopupEl = null;
let selectionPopupText = "";
let selectionPopupSource = null;
