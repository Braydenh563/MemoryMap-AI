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
    const preview = entry.content.length > 40 ? entry.content.slice(0, 39) + "…" : entry.content;
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
        toast(detail.detail || `${file.name}: upload failed (${response.status})`, true);
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

// Full-size image viewer: click anywhere or press Esc to close (Wave M).
// `items` is every image this click can page through, e.g. all the image
// attachments on the same note, as `{filename, getUrl}`, `getUrl` being a
// (possibly async) thunk so unopened images aren't fetched until reached.
// `startIndex` is which one was clicked; a single image is just a one-item
// list. Reported directly: click-anywhere-to-close alone isn't discoverable,
// so there's now an explicit close button too, both still work.
//: `opts.focusReading` opens the dialog *at the reading* rather than at the
//: top of the file, Phase 7.5's "an 'Open reading' action that opens the
//: lightbox at the reading". On a tall document the info panel is below the
//: fold, so a plain open lands the reader on a page and leaves them to find
//: the text they asked for.
function openLightbox(items, startIndex = 0, opts = {}) {
  let index = startIndex;
  const overlay = document.createElement("div");
  overlay.className = "lightbox";
  // Not decoration: this is what puts the lightbox inside `activeOverlay()`'s
  // reach (see its comment), and it is what a screen reader needs to announce
  // the thing as a dialog rather than as a stray region.
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Image viewer");
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-label", "Image preview");

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "lightbox-close";
  closeBtn.setAttribute("aria-label", "Close");
  // A raw "×" character, not an icon-font glyph, reported live as still
  // off-centre even inside the `display:grid;place-items:center` box that
  // fixed every *padding*-driven case of this: `place-items` centres the
  // line box, not necessarily where a font renders that specific character's
  // ink within it, and that varies by system font. Every other close button
  // in the app already uses the ph:x icon glyph for exactly this reason, 
  // matching it here fixes the centring and the inconsistency together.
  setLabel(closeBtn, "ph:x");

  const img = document.createElement("img");
  const broken = document.createElement("p");
  broken.className = "lightbox-broken hidden";
  const meta = document.createElement("div");
  meta.className = "lightbox-meta";

  // What the app knows *about* the picture, shown with the picture. Asked for
  // directly: "if clicking on an image to view expand it in the lightbox…can
  // the captions and ocr accompany it somehow??", before this, the caption a
  // vision model wrote and the text it read off the page existed only on the
  // Library tile, which is the one view too small to read them in. Optional
  // per item (`caption`, `text`, and their bylines): every other caller
  // passes only `{filename, getUrl}` and gets exactly what it got before.
  // Mirrors `syncCaptionBadge` on the Library tile (library.js) exactly, so
  // the same picture says the same thing in both places: which model wrote
  // the description, and whether a person has since changed it.
  const captionBylineFor = (row) => {
    if (!row || !row.caption) return "";
    const parts = [];
    if (row.caption_model) parts.push(captionCredit(row.caption_model));
    if (row.caption_edited) parts.push(row.caption_model ? "edited" : "typed by hand");
    return parts.join(" · ");
  };

  const info = document.createElement("div");
  info.className = "lightbox-info hidden";
  const infoCaption = document.createElement("p");
  infoCaption.className = "lightbox-caption";
  // Who wrote the caption. Reported directly: "there is also no 'text read
  // by' line in the lightbox for the image captions, only the ocr", the
  // Library tile has carried a caption byline (`captionBadge`, library.js)
  // since captions could be edited by hand, and only the lightbox was
  // missing its half, so the same picture named its transcriber but not its
  // describer.
  const infoCaptionByline = document.createElement("p");
  infoCaptionByline.className = "lightbox-byline";
  const infoText = document.createElement("p");
  infoText.className = "lightbox-text";
  const infoByline = document.createElement("p");
  infoByline.className = "lightbox-byline";
  //: The second reader's answer to the same question, under the first one's,
  //: in the same two elements the first one uses: see `lightboxReadingsFor`
  //: for why it is here at all and why it is not a toggle. Both are hidden
  //: together, so a picture with one reading looks exactly as it did.
  const infoAltText = document.createElement("p");
  infoAltText.className = "lightbox-text lightbox-alt-text";
  const infoAltByline = document.createElement("p");
  infoAltByline.className = "lightbox-byline";
  //: **Each reading can be deleted where it is shown** (INBOX 421 e, the
  //: owner: "I cant delete the ocr entry in ... the lightbox"). The OCR
  //: workspace had a Delete reading and this panel, the other place a reading
  //: is read, had none, so a wrong one (a model's "Test, Test, Test" loop)
  //: could only be removed by opening the workspace. One trash button at the
  //: end of each reading's byline, clearing that reading's own field
  //: (`textSource`/`altSource` from `lightboxReadingsFor`), confirmed first,
  //: the workspace's own wording. Only for a picture with a media row: a url
  //: with nothing behind it has nothing to delete.
  const readingDelete = (which) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ghost small icon-only danger lightbox-reading-delete hidden";
    button.title = "Delete this reading";
    button.setAttribute("aria-label", "Delete this reading");
    setLabel(button, "ph:trash");
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      //: Held before the first `await`: `currentTarget` is gone once the
      //: click's dispatch ends (the workspace's own Delete reading lost its
      //: button that way, 6e072b2).
      const self = event.currentTarget;
      const item = lightboxInfoItem || items[index];
      const source = which === "alt" ? item?.altSource : item?.textSource;
      const id = lightboxMediaId(item);
      if (!item || !source || !id) return;
      const whose = source === "vision" ? "the vision model's" : "Tesseract's";
      if (!(await confirmDialog(`Delete ${whose} reading of this image? You can read it again any time.`))) return;
      self.disabled = true;
      try {
        const updated = await apiJson(`/media/${id}/${source === "vision" ? "vision-ocr" : "ocr"}`, {
          method: "POST",
          body: JSON.stringify({ text: "" }),
        });
        Object.assign(item, lightboxReadingsFor(updated));
        if (overlay.isConnected) renderInfo(item, true);
        if (typeof loadLibrary === "function") loadLibrary();
        toast("Reading deleted.");
      } catch (err) {
        toast(err.message || "Could not delete that reading.", true);
      } finally {
        self.disabled = false;
      }
    });
    return button;
  };
  const infoTextDelete = readingDelete("text");
  const infoAltDelete = readingDelete("alt");
  const bylineRow = (byline, remove) => {
    const row = document.createElement("div");
    row.className = "lightbox-byline-row";
    row.append(byline, remove);
    return row;
  };
  // Dimensions, when it was added, the filename, the "other info about it"
  // half of the request. First, because it is the line that says *which*
  // picture this is; the readings below it are about what is in it.
  const infoFacts = document.createElement("p");
  infoFacts.className = "lightbox-facts";
  //: **What only a document has** (UI_MODERNISATION_PLAN Phase 7.1). Reported:
  //: "the lightbox needs improving for file and pdf previews, no sections or
  //: info are below it really compared to the images." An image already got
  //: facts, caption, reading and bylines under it; a PDF got the pages and
  //: nothing else: and the three things a *document* can say that a
  //: photograph cannot (how many pages it has, which of them have been read,
  //: and which one you are looking at) had nowhere to be said.
  //:
  //: One row of `.chip`s, one per page, in the panel that already exists, 
  //: not a second info block. A chip is a page: it says whether that page has
  //: a stored reading, and clicking it scrolls the pages column to it, which
  //: is also what makes "open the reader at *this* page" a meaningful offer.
  const infoPages = document.createElement("div");
  infoPages.className = "row lightbox-pages hidden";
  info.append(
    infoFacts,
    infoPages,
    infoCaption,
    infoCaptionByline,
    infoText,
    bylineRow(infoByline, infoTextDelete),
    infoAltText,
    bylineRow(infoAltByline, infoAltDelete)
  );
  //: The media row a reading can be deleted from: the Library's own items
  //: carry it as `id` (and a document as `kind`, which has no such row); a
  //: picture opened from a note or a chat learns it from `/media/meta`.
  function lightboxMediaId(item) {
    if (!item || item.kind) return null;
    return item.id || item.metaId || null;
  }
  //: Shown only beside a reading that is on screen and deletable. Not on a
  //: document's page: that text is the page's own `PageRead`, deleted from
  //: the workspace, not a field of the file.
  function syncReadingDeletes(item, { text = "", alt = "", perPage = false } = {}) {
    const id = lightboxMediaId(item);
    infoTextDelete.classList.toggle("hidden", perPage || !id || !text || !item?.textSource);
    infoAltDelete.classList.toggle("hidden", perPage || !id || !alt || !item?.altSource);
  }

  //: Drawn from one place, because both `show()` and `renderInfo` paint this
  //: panel and a second reading left behind by the previous picture is worse
  //: than never showing one at all.
  function renderAltReading(text, byline) {
    const alt = (text || "").trim();
    infoAltText.textContent = alt;
    infoAltText.classList.toggle("hidden", !alt);
    infoAltByline.textContent = alt ? byline || "" : "";
    infoAltByline.classList.toggle("hidden", !alt || !byline);
  }
  // Clicking the panel must not dismiss the dialog, someone selecting a line
  // of transcribed text to copy is the whole reason it is here.
  info.addEventListener("click", (e) => e.stopPropagation());

  const prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.className = "lightbox-nav lightbox-prev";
  prevBtn.setAttribute("aria-label", "Previous image");
  setLabel(prevBtn, "ph:caret-left");

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "lightbox-nav lightbox-next";
  nextBtn.setAttribute("aria-label", "Next image");
  setLabel(nextBtn, "ph:caret-right");

  // **The arrows are centred by the layout now, not by a measurement.**
  //
  // They used to be `position: fixed` at `top: 50%`, which is the viewport's
  // centre and not the image's; a previous fix measured the image's rendered
  // box on every `show()` and wrote a `top` back. That worked while the
  // lightbox was one centred stack, and stopped working the moment it grew a
  // scrollable info panel: reported with a screenshot of both arrows sitting
  // level with the top edge of the picture.
  //
  // The fix is structural: the image and the two arrows share a positioned
  // wrapper, so `top: 50%; translateY(-50%)` is the middle of the *image*, at
  // every size, at every scroll offset, with no JS and nothing to keep in
  // sync. `positionNav`, its `resize` listener and its two callers are gone.
  const stage = document.createElement("div");
  stage.className = "lightbox-stage";

  // **The actions bar.** Asked for directly: "improve on and expand the
  // capabilities and features at the bottom of the lightbox". Until now the
  // lightbox was purely an *information* surface, filename, dimensions,
  // caption, OCR text: with no action on it at all, which meant the one
  // place you are actually looking at a picture was the one place you could
  // not do anything to it.
  //
  // Everything here works from what `openLightbox` already receives, so it
  // lights up for **every** caller (notes, chat, graph, dashboard, library)
  // rather than only the Library's richer items. Actions that need a media
  // id, describe with AI, re-run OCR, rename, delete, are deliberately
  // not here: no caller passes one today, and inventing a half-working row
  // that only the Library populates is the "two buttons guaranteed to fail"
  // shape this project has already rejected once on the whiteboard menu.
  const actions = document.createElement("div");
  actions.className = "lightbox-actions";
  actions.addEventListener("click", (e) => e.stopPropagation());

  // Zoom is the gap that mattered most: a lightbox that cannot magnify is
  // just a bigger thumbnail, and the OCR panel below is often the only way
  // to read text in a picture precisely because you could not zoom into it.
  let zoom = 1;
  const ZOOM_MIN = 1;
  const ZOOM_MAX = 6;
  const zoomLabel = document.createElement("span");
  zoomLabel.className = "muted lightbox-zoom-label";
  // A single image is the usual target; a PDF shown as pages (pdfPages,
  // below) is a second one, added when PDFs stopped being AI-text-only, 
  // "or zoom. a lot of controls are missing," reported live once pages
  // started rendering. Same zoom state and the same three buttons drive
  // both; only which element the transform lands on, and which container's
  // scroll resets on "Fit", differ.
  const zoomTarget = () => (!pdfPages.classList.contains("hidden") ? pdfPages : img);
  const scrollTarget = () => (!pdfPages.classList.contains("hidden") ? doc : stage);
  const applyZoom = () => {
    const target = zoomTarget();
    target.style.transform = zoom === 1 ? "" : `scale(${zoom})`;
    // Set on the stage too, a multi-page column has no single element
    // whose own hover state would otherwise flip the grab cursor.
    target.classList.toggle("zoomed", zoom > 1);
    stage.classList.toggle("zoomed", zoom > 1);
    zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
    // Only grab-able once there is something to pan to.
    //: **Only when it is not already there** (INBOX 424f). `show()` sets the
    //: zoom back to fit for every picture, so paging through a gallery called
    //: `scrollTo` on every press, and a `scrollTo` against a stage whose
    //: picture was just swapped is a forced layout: measured at 4x CPU, 375ms
    //: of five next/previous presses, for a stage that was already at its
    //: origin. `scrolledAway` is kept by the scroll listeners below, so the
    //: question costs no layout read.
    if (zoom === 1) {
      const scroller = scrollTarget();
      if (scrolledAway.has(scroller)) {
        scroller.scrollTo({ left: 0, top: 0 });
        scrolledAway.delete(scroller);
      }
    }
  };
  //: Which of the two scrollers is somewhere other than its top-left corner,
  //: from their own scroll events (a pan, a scrollbar, a wheel, the browser
  //: clamping after the content changed), read when the event fires, when
  //: layout is already clean.
  const scrolledAway = new WeakSet();
  const trackScrolledAway = (el) => {
    el.addEventListener(
      "scroll",
      () => {
        if (el.scrollLeft || el.scrollTop) scrolledAway.add(el);
        else scrolledAway.delete(el);
      },
      { passive: true }
    );
  };
  trackScrolledAway(stage);
  const setZoom = (next) => {
    zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(next * 100) / 100));
    applyZoom();
  };
  const actionBtn = (label, title, fn) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "ghost small lightbox-action";
    b.title = title;
    setLabel(b, label);
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      fn(b);
    });
    actions.appendChild(b);
    return b;
  };

  const zoomOutBtn = actionBtn("ph:magnifying-glass-minus", "Zoom out", () => setZoom(zoom - 0.5));
  actions.appendChild(zoomLabel);
  const zoomInBtn = actionBtn("ph:magnifying-glass-plus", "Zoom in", () => setZoom(zoom + 0.5));
  const resetBtn = actionBtn("ph:arrows-in Fit", "Back to fit", () => setZoom(1));

  //: **The page stepper**: Phase 7.1's "a way to say which page you are on".
  //:
  //: The pages column already scrolls, and scrolling is the right way to read
  //: a document; what it could not do is *name* the page under your eye, which
  //: is the one fact everything else here hangs off, the read/unread chip that
  //: is current, and which page "open the reader here" opens. So this is a
  //: readout with two buttons, not a pager that replaces scrolling: both
  //: directions still work and they stay in sync (the scroll listener wired in
  //: `wireDocPageTracking` below writes the label back).
  //:
  //: Built here rather than further down because `actionBtn` appends in
  //: creation order and "where you are" belongs beside the zoom controls,
  //: which are the other thing that answers "what am I looking at".
  let docPageCount = 0;
  let docPage = 0;
  const docPagesRead = new Set();
  //: page index -> `{text, model, caption, caption_model}`, from the same
  //: `page-reads` response the chips are built from. **Per page** is the whole
  //: point (Phase 7.3): one caption under a whole PDF describes none of its
  //: pages, and the joined reading of every page is not what you are looking
  //: at when page 4 is on screen.
  const docPageRows = new Map();
  const pagePrevBtn = actionBtn("ph:caret-left", "Previous page", () => setDocPage(docPage - 1));
  const pageLabel = document.createElement("span");
  pageLabel.className = "muted lightbox-page-label";
  //: `role="status"`, matching the OCR workspace's own page label: the page
  //: changes without focus moving, so a screen reader is otherwise never told.
  pageLabel.setAttribute("role", "status");
  actions.appendChild(pageLabel);
  const pageNextBtn = actionBtn("ph:caret-right", "Next page", () => setDocPage(docPage + 1));
  const pageControls = [pagePrevBtn, pageLabel, pageNextBtn];
  const showPageControls = (on) =>
    pageControls.forEach((el) => el.classList.toggle("hidden", !on));
  showPageControls(false);

  //: Whichever box actually scrolls the pages. In the plain document view that
  //: is `.lightbox-doc`; once the reading is showing beside the pages
  //: (`lightbox-doc-split`) the pages column becomes its own scroller. Asking
  //: the DOM rather than tracking the mode: the split is toggled in three
  //: places and a fourth would silently scroll the wrong box.
  const pageScroller = () =>
    pdfPages.scrollHeight > pdfPages.clientHeight + 1 ? pdfPages : doc;

  function syncPageChips() {
    for (const chip of infoPages.querySelectorAll(".lightbox-page-chip")) {
      chip.classList.toggle("is-current", Number(chip.dataset.page) === docPage);
      chip.setAttribute("aria-current", Number(chip.dataset.page) === docPage ? "true" : "false");
    }
    pageLabel.textContent = docPageCount ? `Page ${docPage + 1} of ${docPageCount}` : "";
    pagePrevBtn.disabled = docPage <= 0;
    pageNextBtn.disabled = docPage >= docPageCount - 1;
    //: The panel below is about *this* page, its reading, its figures, so
    //: it is redrawn with the number, not only when the file changes.
    if (lightboxInfoItem) renderInfo(lightboxInfoItem, true);
    //: The workspace button opens at the page named here, so it has to say so
    //:, a button whose behaviour depends on invisible state is the affordance
    //: problem this app keeps fixing elsewhere.
    readWithAiBtn.title = docPageCount
      ? `Open the page reader at page ${docPage + 1}: the page beside what it says`
      : "Open the page reader: see each page beside what it says";
  }

  //: Set the current page *and* scroll to it. `setDocPage` is the user asking
  //: for a page; `noteDocPage` (below) is the scroll position telling us which
  //: one arrived: they must not call each other, or a scroll would fight the
  //: scroll it triggered.
  function setDocPage(next) {
    if (!docPageCount) return;
    docPage = Math.max(0, Math.min(docPageCount - 1, next));
    const target = pdfPages.children[docPage];
    if (target) {
      const scroller = pageScroller();
      //: Rects rather than `offsetTop`: `offsetTop` is measured against the
      //: nearest *positioned* ancestor, which is not the scroller in either
      //: of the two layouts this has to work in.
      scroller.scrollTop += target.getBoundingClientRect().top
        - scroller.getBoundingClientRect().top;
    }
    syncPageChips();
  }

  //: One chip per page, marked with whether that page has a stored reading.
  //: This is Phase 7.1's "which pages have been read", and it is deliberately
  //: the same `.chip` recipe the rest of the app uses rather than a bespoke
  //: badge: a page is a thing you can pick, which is what a chip is for.
  function renderDocPages() {
    infoPages.replaceChildren();
    infoPages.classList.toggle("hidden", docPageCount < 1);
    if (docPageCount < 1) return;
    const lead = document.createElement("span");
    lead.className = "muted text-sm lightbox-pages-lead";
    lead.textContent = docPagesRead.size
      ? `${docPagesRead.size} of ${docPageCount} pages read`
      : `${docPageCount} page${docPageCount === 1 ? "" : "s"} · none read yet`;
    infoPages.appendChild(lead);
    for (let i = 0; i < docPageCount; i++) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip chip-interactive lightbox-page-chip";
      chip.classList.toggle("is-read", docPagesRead.has(i));
      chip.dataset.page = String(i);
      chip.textContent = String(i + 1);
      //: The number alone is not a label, "3" tells a screen reader nothing
      //: about what it is or what pressing it does.
      chip.setAttribute(
        "aria-label",
        docPagesRead.has(i) ? `Page ${i + 1}, already read` : `Page ${i + 1}, not read yet`
      );
      chip.title = chip.getAttribute("aria-label");
      chip.addEventListener("click", (e) => {
        e.stopPropagation();
        setDocPage(i);
      });
      infoPages.appendChild(chip);
    }
    syncPageChips();
  }

  //: Back to "this is not a document", called wherever the lightbox changes
  //: what it is showing, so a photograph never inherits the previous file's
  //: page count and a stale stepper never offers page 7 of an image.
  function resetDocPages() {
    docPageCount = 0;
    docPage = 0;
    docPagesRead.clear();
    docPageRows.clear();
    showPageControls(false);
    infoPages.replaceChildren();
    infoPages.classList.add("hidden");
  }

  //: Which pages already have a stored reading (`PageRead`, see the model's
  //: own docstring). Best-effort and never throws: the pages themselves render
  //: with no AI in the loop at all, and this panel must not be the thing that
  //: makes a document unviewable when the store cannot answer.
  async function loadDocPageReads(attachmentId, name, item) {
    let base = attachmentId ? `/files/${attachmentId}` : "";
    if (!base) {
      //: A `/media/` upload is addressed by *id* here and by *stored name*
      //: everywhere else in this function. The Library gallery is the one
      //: caller that already holds the id; every other one has a url, so the
      //: id is looked up the same way `hydrate` looks up the rest of the
      //: metadata rather than leaving the panel empty for eight of nine
      //: callers.
      let id = item.id;
      if (!id && name) {
        const row = await apiJson(`/media/meta/${encodeURIComponent(name)}`).catch(() => null);
        id = row?.id;
      }
      if (!id) return;
      //: Now that the id is known the workspace can be addressed too, the
      //: same button previously fell back to the flat inline reading for
      //: exactly this case.
      if (!lightboxOcrTarget) {
        lightboxOcrTarget = {
          id,
          _isAttachment: false,
          original_name: item.filename || name,
          //: See the note beside the other place this target is built: the
          //: page images are addressed by stored name, so leaving `url` off
          //: opens the workspace on a stage that 404s.
          url: `/media/${name}`,
        };
      }
      base = `/media/${id}`;
    }
    const body = await apiJson(`${base}/page-reads`).catch(() => null);
    for (const page of body?.pages || []) {
      const index = Number(page.page) || 0;
      if ((page.text || "").trim()) docPagesRead.add(index);
      docPageRows.set(index, {
        text: (page.text || "").trim(),
        model: page.model || "",
        caption: (page.caption || "").trim(),
        caption_model: page.caption_model || "",
      });
    }
    renderDocPages();
    //: The facts line carries the same count, so it has to be redrawn with the
    //: chips or the panel says "none read yet" above a row of read pages.
    renderInfo(item, true);
  }

  function noteDocPage() {
    if (!docPageCount) return;
    const scroller = pageScroller();
    const top = scroller.getBoundingClientRect().top;
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < pdfPages.children.length; i++) {
      //: The page whose top edge is closest to the top of the viewport, from
      //: either side: a page scrolled half off the top is still the page you
      //: are reading, so `Math.abs` rather than "the first one still below".
      const distance = Math.abs(pdfPages.children[i].getBoundingClientRect().top - top);
      if (distance < best) {
        best = distance;
        nearest = i;
      }
    }
    if (nearest === docPage) return;
    docPage = nearest;
    syncPageChips();
  }
  //: **"Open this in the editor", from the preview.** Asked for directly: "add
  //: an edit document button to previewed documents in the lightbox." The
  //: Library's own kebab offers Preview *and* Open, but once you are in the
  //: preview and have decided you want to change something, the only route
  //: back was to close the lightbox, find the row again and pick the other
  //: menu item: three steps to answer a question the preview itself raised.
  //:
  //: Only for a *document*: the lightbox also shows attachments and uploaded
  //: files, which have their own in-place edit (`editFileBtn`) and no row in
  //: the Documents tab to open. `item.documentId` is what says which is which,
  //: set by the one caller that previews a document.
  const openDocBtn = actionBtn("ph:pencil-simple Edit document", "Open this in the document editor", () => {
    const target = items[index];
    if (!target || !target.documentId) return;
    close();
    switchTab("documents");
    openDocument(target.documentId);
  });
  openDocBtn.classList.add("hidden");
  // Zoom is an image control. A document scrolls and reflows instead, so
  // showing a disabled-in-spirit 100% beside a page of text is three
  // controls that do nothing, the same "only show what this can do"
  // reasoning the whiteboard context menu already settled.
  const zoomControls = [zoomOutBtn, zoomLabel, zoomInBtn, resetBtn];
  const showZoomControls = (on) =>
    zoomControls.forEach((el) => el.classList.toggle("hidden", !on));

  // Wheel-to-zoom, because that is what every image viewer does and a person
  // who has zoomed once will try it. Non-passive so the page behind cannot
  // scroll out from under the picture mid-zoom.
  //
  // **Only while an image is actually showing.** Reported live, from a real
  // multi-page PDF: "it crashed when I tried to view a pdf and i couldnt
  // scroll." Not a crash: `stage` is the shared container for both the
  // picture view and `.lightbox-doc` (text, and now PDF pages), and this
  // handler used to call `preventDefault()` on every wheel event over it
  // unconditionally, regardless of which one was showing. Over a scrolling
  // multi-page PDF that blocked the browser's own scroll on every tick
  // while doing nothing visible in return, `setZoom` only ever touches the
  // single `<img>` element's transform, which isn't part of the document
  // view at all. `doc.classList.contains("hidden")` is the same check
  // `show()` already uses to know which of the two is current.
  stage.addEventListener(
    "wheel",
    (e) => {
      // A browser reports a trackpad pinch gesture as a wheel event with
      // ctrlKey set: the same convention Chrome/Firefox use for
      // Maps/Docs/Figma-style pinch-to-zoom: so it still reaches zoom even
      // while the document view owns plain scroll below. Plain wheel/two-
      // finger scroll over a document (not pinch) is left alone entirely.
      if (!doc.classList.contains("hidden") && !e.ctrlKey) return;
      if (!doc.classList.contains("hidden") && pdfPages.classList.contains("hidden")) return; // plain text: nothing to zoom
      e.preventDefault();
      setZoom(zoom + (e.deltaY < 0 ? 0.25 : -0.25));
    },
    { passive: false }
  );

  // Drag to pan, once zoomed. The scrollbars already pan the stage, but a
  // magnified picture with `cursor: grab` on it that does not actually drag
  // is an affordance telling a lie, every image viewer drags here.
  //
  // Bound to both `img` and `pdfPages`, panning whichever container
  // `scrollTarget()` says actually scrolls (`stage` for the image, `doc`
  // for PDF pages): reported live: "when zooming in on docs or images etc
  // in the lightbox, i cant drag to adjust the zoom position." This only
  // ever panned `stage.scroll{Left,Top}` via listeners on `img` alone, the
  // same single-target gap `zoomTarget()`/`scrollTarget()` above already
  // exist to close for zoom and Fit; drag never got the same treatment when
  // PDF pages gained their own zoomable, independently-scrolling view.
  let panning = null;
  const startPan = (el) => (e) => {
    if (zoom === 1) return;
    e.preventDefault();
    const scroller = scrollTarget();
    panning = { x: e.clientX, y: e.clientY, left: scroller.scrollLeft, top: scroller.scrollTop };
    el.setPointerCapture(e.pointerId);
    el.style.cursor = "grabbing";
  };
  const movePan = (e) => {
    if (!panning) return;
    const scroller = scrollTarget();
    scroller.scrollLeft = panning.left - (e.clientX - panning.x);
    scroller.scrollTop = panning.top - (e.clientY - panning.y);
    //: Now, not at the scroll event a frame later: a Fit pressed inside that
    //: frame must still see the pan.
    scrolledAway.add(scroller);
  };
  const endPan = (el) => (e) => {
    if (!panning) return;
    panning = null;
    el.style.cursor = "";
    if (e.pointerId !== undefined && el.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }
  };
  // A drag that ends on the picture must not also read as a click on the
  // backdrop, which closes the dialog, panning to the edge of a picture
  // and having the whole thing vanish is the bug this prevents.
  //
  // `pdfPages` doesn't exist yet at this point in `openLightbox` (it's
  // built further down, alongside the rest of the document view), wiring
  // it up here throws a temporal-dead-zone ReferenceError the instant the
  // lightbox opens. `bindPan`, called once `pdfPages` is actually in scope.
  const bindPan = (el) => {
    el.addEventListener("pointerdown", startPan(el));
    el.addEventListener("pointermove", movePan);
    el.addEventListener("pointerup", endPan(el));
    el.addEventListener("pointercancel", endPan(el));
    el.addEventListener("click", (e) => e.stopPropagation());
  };
  bindPan(img);

  // Copy the text the app read out of the picture. Hidden unless this item
  // actually has some: an enabled button that copies "" is a lie.
  // Goes through the app's own `copyToClipboard` helper rather than the raw
  // browser clipboard call: caught by
  // test_every_copy_path_goes_through_the_fallback (whose naive string scan
  // would otherwise flag even *this comment* if it spelled the call out
  // literally, which is why it doesn't). The helper already covers what a
  // hand-rolled version here did not: a non-secure context, permission
  // refused, and a last-resort "here's the text, already selected" UI when
  // both fail, instead of this button just going silent.
  //: What the info panel is currently showing, which for a document is *one
  //: page's* reading rather than the file's joined one (see `renderInfo`).
  //: Copy has to hand over what is on screen: copying every page while the
  //: panel shows page 4 is the app disagreeing with itself about "this text".
  let lightboxShownText = "";
  const copyBtn = actionBtn("ph:copy Copy text", "Copy the text read from this image", async (b) => {
    const value = (lightboxShownText || items[index].text || "").trim();
    if (!value) return;
    await copyToClipboard(value, b);
  });

  // Save the original file. `download` needs a same-origin href to name the
  // file, which `mediaSrc()` gives us: it is this app's own /media route.
  actionBtn("ph:download-simple Save", "Save this file to your computer", async () => {
    try {
      const current = items[index];
      const href = await current.getUrl();
      const a = document.createElement("a");
      a.href = href;
      // **A document leaves `download` unset, an image sets it.** A
      // non-empty `download` attribute wins over the server's own
      // `Content-Disposition: filename="..."`, for
      // `/documents/{id}/export.md`, that header already carries the
      // right extension for the file's actual type (`.py`, `.json`,
      // `.md`, whatever `filetypes.get` picked), computed server-side.
      // Setting `download` to a bare title here would have downloaded a
      // "Quarterly Report" with no extension at all, silently discarding
      // that work: an image has no such header to defer to, so it keeps
      // naming itself.
      if (!current.kind) a.download = current.filename || "image";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      toast("Couldn't save that file.", true);
    }
  });

  // Only shown while a PDF is displayed as pages (see showDocument): swaps
  // to the AI-extracted-text view on demand, rather than automatically. A
  // PDF's *pages* render with zero AI involvement; reading its words with a
  // model is a deliberate, opt-in second step, not something a user has to
  // sit through just to look at their own document.
  //: **Which PDF the OCR workspace should open, or null.** Set by
  //: `showDocument`'s PDF branch, where the file's identity is actually
  //: known; cleared wherever the lightbox resets for a new file.
  let lightboxOcrTarget = null;

  const readWithAiBtn = actionBtn("ph:sparkle Read text with AI", "Open the page reader: see each page beside what it says", () => {
    //: **One reader, not two.** Reported: *"that panel is separate from the
    //: lightbox where you can select to read the text on the document, and I
    //: feel like that button should show the other text on page panel
    //: popup."* This button used to swap the lightbox to a flat blob of
    //: extracted text, while the OCR workspace, page rail, region boxes,
    //: per-page and now per-range reads, copy, save as note, was a separate
    //: window reachable only from a file card's menu. Two answers to "what
    //: does this document say", and the worse one was on the file you were
    //: looking at.
    //:
    //: Falls back to the old inline text when the workspace cannot be
    //: addressed (no id resolved, or library.js absent on this surface):
    //: degrading to the flat reading beats a button that does nothing.
    //: **At the page you are looking at, not at page 1.** Phase 7.1 asked for
    //: "a way into the OCR Workspace at that page", and the third argument is
    //: it: a fifteen-page scan opened at its first page from page nine is a
    //: navigation the reader has to redo by hand, every time.
    if (lightboxOcrTarget && typeof window.openOcrWorkspace === "function") {
      //: **The lightbox goes before the workspace arrives.** Reported: *"when
      //: I open a pdf file in the lightbox and press the read text with ai, it
      //: opens the ocr workspace but behind the lightbox so the lightbox needs
      //: to close when the workspace opens."* Measured: `.lightbox` is
      //: `z-index: 1020` (raised there to clear the CSS full-screen graph, see
      //: its own comment) and the workspace is a `.modal-overlay` at 1010, so
      //: the workspace really did open underneath and every click landed on
      //: the lightbox's zoom-out backdrop instead. The fix is the one the
      //: gallery kebab's "See text on the page" row already uses ten lines
      //: down, `close()` first: two stacked overlays leave the page behind
      //: unreachable whichever of them wins the stacking contest, so raising
      //: the workspace above the lightbox would answer the z-index and not the
      //: report. The target and the page are read into locals before the
      //: dismiss because `close()` empties the lightbox's own state.
      const target = lightboxOcrTarget;
      const atPage = docPageCount ? docPage : 0;
      close();
      window.openOcrWorkspace(target, [], atPage);
      return;
    }
    lightboxLoadExtractedText?.();
  });
  readWithAiBtn.classList.add("hidden");

  //: **Edit / Save / Cancel for a text file**, §R7.1 item 2. Set by
  //: `showDocument` for whichever file is open; null while the lightbox is
  //: showing a picture or a PDF's pages, which is what keeps these three
  //: buttons from acting on the file that happened to be open before.
  let lightboxEditTarget = null;

  function setLightboxEditing(on) {
    docEdit.classList.toggle("hidden", !on);
    docBody.classList.toggle("hidden", on);
    //: Find-in-document searches the *rendered* body, so it has nothing to
    //: work on while the source is showing, and leaving it up would offer a
    //: search that silently matches nothing.
    find.classList.toggle("hidden", on);
    findCount.classList.add("hidden");
    editFileBtn.classList.toggle("hidden", on);
    saveFileBtn.classList.toggle("hidden", !on);
    cancelEditBtn.classList.toggle("hidden", !on);
    //: Export hands back what was *saved*; while a draft is open in the box
    //: the two disagree, and a file exported mid-edit would silently be the
    //: version before the changes on screen.
    if (on) exportTextBtn.classList.add("hidden");
    else if (lightboxExtractedText) exportTextBtn.classList.remove("hidden");
    if (on) docEdit.focus();
  }

  const editFileBtn = actionBtn("ph:pencil-simple Edit", "Edit this file's text", () => {
    if (!lightboxEditTarget) return;
    docEdit.value = lightboxEditTarget.text;
    setLightboxEditing(true);
  });
  editFileBtn.classList.add("hidden");

  const saveFileBtn = actionBtn("ph:check Save changes", "Save this text back over the file", async (button) => {
    if (!lightboxEditTarget) return;
    button.disabled = true;
    try {
      const saved = await apiJson(lightboxEditTarget.url, {
        method: "PUT",
        body: JSON.stringify({ text: docEdit.value }),
      });
      //: Re-rendered from what the server wrote back, not from what was
      //: typed. They are the same today; if they ever differ, a normalised
      //: line ending, a file the OS rewrote, the reader should be looking at
      //: the file, not at the draft of it.
      lightboxEditTarget.text = saved.text || "";
      setLightboxEditing(false);
      lightboxLoadExtractedText?.();
      toast("Saved.");
    } catch (error) {
      //: A 409 is the server declining to overwrite (`docview.editability`),
      //: and its `detail` is written to be read by a person, so it is shown
      //: rather than replaced with a generic failure.
      toast(error.message || "Couldn't save that file.", true);
    } finally {
      button.disabled = false;
    }
  });
  saveFileBtn.classList.add("hidden");

  const cancelEditBtn = actionBtn("ph:x Cancel", "Discard these changes", () => {
    setLightboxEditing(false);
  });
  cancelEditBtn.classList.add("hidden");

  //: **Exporting the *text*, which is a different thing from Save** (§R7.1
  //: item 5, "export, per-format, from the same place the file is viewed").
  //: Save hands back the file as it is on disk, the .pdf, the .docx. This
  //: hands back what the viewer is showing, which for a scanned PDF or a Word
  //: file is the only readable form of it the app has, and until now could be
  //: reached only by selecting the whole pane and copying.
  //:
  //: The extension follows `kind`, not the source file's: markdown text saved
  //: as `report.pdf.md` is honest about being neither a PDF nor a plain
  //: transcript, and opens in the right thing.
  let lightboxExtractedText = null;
  const exportTextBtn = actionBtn("ph:export Export text", "Save the extracted text as a file", async (button) => {
    if (!lightboxExtractedText) return;
    button.disabled = true;
    try {
      const { name, kind, text } = lightboxExtractedText;
      const stem = (name || "document").replace(/\.[^./\\]+$/, "") || "document";
      const extension = kind === "markdown" ? "md" : "txt";
      await saveFile(`${stem}.${extension}`, new Blob([text], { type: "text/plain" }));
    } catch (error) {
      toast(error.message || "Couldn't export that text.", true);
    } finally {
      button.disabled = false;
    }
  });
  exportTextBtn.classList.add("hidden");

  //: Whether the preview frame is currently showing something.
  let docPreviewOn = false;

  function clearDocPreview() {
    docPreviewOn = false;
    docFrame.classList.add("hidden");
    //: `about:blank` rather than leaving the last file loaded: an iframe that
    //: still holds a document keeps rendering it, and paging to the next file
    //: would show the previous one's page for as long as the new fetch takes.
    docFrame.src = "about:blank";
    previewHtmlBtn.setAttribute("aria-pressed", "false");
    setLabel(previewHtmlBtn, "ph:browser Preview");
  }

  const previewHtmlBtn = actionBtn("ph:browser Preview", "Render this HTML file (scripts are not run)", () => {
    if (docPreviewOn) {
      clearDocPreview();
      docBody.classList.remove("hidden");
      find.classList.remove("hidden");
      return;
    }
    if (!lightboxPreviewSource) return;
    //: **A server URL, not a `blob:` from the text we already have.** The
    //: first version did the obvious thing and built a Blob, and a `blob:`
    //: document inherits its creator's CSP, so this app's `style-src 'self'`
    //: applied to the framed page and refused the page's *own* `<style>`
    //: block. Measured: "Refused to apply inline style", and a page setting
    //: `background:#eef` rendered transparent. `/files/{id}/html-preview`
    //: carries its own policy (`HTML_PREVIEW_CSP`, routes_files.py): 
    //: sandboxed, scriptless, and allowed to style itself.
    docFrame.src = mediaSrc(lightboxPreviewSource);
    docPreviewOn = true;
    docFrame.classList.remove("hidden");
    docBody.classList.add("hidden");
    //: Find-in-document reads the rendered *source* listing; the frame is a
    //: separate document this page deliberately cannot reach into.
    find.classList.add("hidden");
    findCount.classList.add("hidden");
    previewHtmlBtn.setAttribute("aria-pressed", "true");
    setLabel(previewHtmlBtn, "ph:code Show source");
  });
  previewHtmlBtn.classList.add("hidden");
  previewHtmlBtn.setAttribute("aria-pressed", "false");

  //: The URL the preview frame would load, set by `showDocument` only for a
  //: file that is actually HTML *and* is a real attachment (a `/media/`
  //: upload is never HTML, `MEDIA_SUFFIXES` is images and PDF, and a native
  //: document has no file behind it at all). Null the rest of the time, which
  //: is what keeps the button from framing the file viewed before this one.
  let lightboxPreviewSource = null;

  // **The AI/manage actions: gated on a media id, and only ever visible
  // when one is present.** Reported directly, and left open on purpose the
  // first time this bar was built: rename, describe with AI, read text (two
  // ways) and delete all need a real `MediaUpload` row, and of nine
  // `openLightbox` callers only the Library's own gallery has one to pass.
  // Every other caller (a note attachment, a chat image, a graph or
  // dashboard thumbnail, a whiteboard object) opens the lightbox from a bare
  // url, and a menu that 404s on click is worse than no menu, the same "two
  // buttons guaranteed to fail" shape this project already rejected once on
  // the whiteboard's own context menu.
  //
  // Reuses the endpoints and request shapes the gallery kebab already
  // established (library.js) rather than inventing a second idea of what
  // "describe with AI" does.
  let moreMenu = null;
  const buildMoreMenu = (item) => {
    //: **The job outlives the window that started it.**
    //:
    //: Reported: "if i close the lightbox as I am generating ocr, then it
    //: stops and I have to restart it again." The request never actually
    //: stopped: a `POST` keeps going and writes its result to the database
    //: whatever the browser does next, but every trace of it was inside the
    //: lightbox, so closing that window meant the work became invisible and
    //: then, on reopening, appeared not to have happened.
    //:
    //: Three changes make it true as well as visible: a progress toast that
    //: lives outside the lightbox, a re-render that is guarded rather than
    //: assumed (the panel may be gone by now, and writing to it threw), and a
    //: Library refresh so the gallery behind shows the new text either way.
    const run = (label, busyText, endpoint, applyTo) => async () => {
      const name = item.original_name || "this file";
      const progress = toastProgress(`${busyText} ${name}`);
      try {
        //: Registered with the OCR workspace's own in-flight map, so a read
        //: started here is still findable after this window closes, reported:
        //: "I close the lightbox, the ocr workspace is gone… it should be
        //: openable if an active ocr reading is going on."
        const updated = await (window.trackOcrRead || ((_i, _l, p) => p))(
          item,
          `${busyText} ${name}`,
          //: `force: true`, always. Reported: "the image captioning and ocr didnt
          //: work when I didnt like the output, deleted what was there and
          //: tried to do it again." A click on Describe / Read *is* the
          //: request to do it again, the server's "keep what exists" guard is
          //: for the automatic pass on upload, not for a person pressing the
          //: button a second time.
          apiJson(`/media/${item.id}${endpoint}`, { method: "POST", body: JSON.stringify({ force: true }) })
        );
        applyTo(item, updated);
        //: Only if this lightbox is still the one on screen. `renderInfo`
        //: writes into elements this closure captured, and they are detached
        //: once the overlay closes.
        if (overlay.isConnected && !overlay.classList.contains("hidden")) renderInfo(item, true);
        if (typeof loadLibrary === "function") loadLibrary();
        progress.done(`Finished reading ${name}.`, {
          actionLabel: "Show it",
          onAction: () => {
            switchTab("library");
            if (typeof renderLibrary === "function") renderLibrary();
          },
        });
      } catch (err) {
        progress.done(err.message || `Couldn't ${label.toLowerCase()}.`, { isError: true });
      }
    };
    const items = [
      {
        label: "ph:sparkle Describe with AI",
        title: "Generate a caption for this image",
        run: run("describe", "Describing…", "/caption", (it, u) => {
          it.caption = u.caption || "";
          it.captionByline = captionBylineFor(u);
        }),
      },
      {
        label: "ph:text-aa Read text with AI",
        title: "Read the text in this image with a vision model",
        //: The response carries both readings, so the panel is rebuilt from the
        //: whole row rather than from the field this call happened to write:
        //: re-reading with a model used to drop a Tesseract reading that was
        //: still stored, and running Tesseract used to promote it over a vision
        //: reading that is still the current one.
        run: run("read text", "Reading…", "/vision-ocr", (it, u) => {
          Object.assign(it, lightboxReadingsFor(u));
        }),
      },
    ];
    // "the whole application is offline anyway with local models so that
    // title is confusing" (reported directly): renamed to name the actual
    // method (Tesseract) instead of a property ("offline") every reading
    // path in this app already shares. And: "the option should be disabled
    // or hidden if the user doesn't have pytesseract installed", `/models/
    // status`'s `tesseract_available` (routes_models.py) is a plain
    // `shutil.which` check, so this can just not offer a button that would
    // otherwise silently do nothing, matching how the model-pull panel
    // already hides itself on a backend that can't pull.
    //: And now it is *left out* rather than shown greyed, which is the
    //: second half of the same report: "make sure all the fila and document
    //: ocr worfs with ai ocr models, I dont use tesseract." A disabled row
    //: that can never become enabled (this app never installs the binary, by
    //: instruction) is a permanent piece of dead chrome in a menu that opens
    //: on every image: and it sat directly under the row that does the same
    //: job with a model, which is the one the reader wants. INSTALL.md still
    //: documents the offline reader for anyone who wants it.
    if (!modelStatus || modelStatus.tesseract_available !== false) {
      items.push({
        label: "ph:scan Read text (Tesseract OCR)",
        title: "Read the text in this image with Tesseract, a fast local tool, no AI model involved",
        run: run("read text", "Reading…", "/ocr", (it, u) => {
          Object.assign(it, lightboxReadingsFor(u));
        }),
      });
    }
    //: The other door into the OCR workspace (library.js). The gallery's own
    //: kebab has it too, and this is the same act from the other surface: the
    //: lightbox is where you are *looking* at the page, which is exactly when
    //: "where did that line come from" gets asked. Gated on a media id like
    //: every other row here, and on the row being an image the extractor can
    //: open: a menu row guaranteed to 415 is worse than a shorter menu.
    //: PDFs included since the workspace learned to rasterise a page
    //: (`_pdf_regions_for`, routes_files.py): reported as *"is the document
    //: ocr even working??"*, and it was not: this gate is what kept every
    //: document out of the one window built to read documents.
    if (/\.(png|jpe?g|gif|webp|bmp|pdf)$/i.test(item.filename || "")) {
      items.push({
        label: "ph:selection-all See text on the page",
        title: "Open this file beside the text read from it, page by page",
        run: async () => {
          //: `close` is this lightbox's own dismiss (defined further down in
          //: `openLightbox`, hoisted and initialised long before any menu row
          //: can run). The workspace is a modal too, and two stacked overlays
          //: leave the page behind unreachable.
          close();
          //: `_src`, not `url`: the lightbox item already carries a resolved
          //: src (`getUrl` runs it through `mediaSrc`, which resolves a staged
          //: picture to its blob), so the workspace takes it as it is.
          window.openOcrWorkspace?.(
            {
              id: item.id,
              _src: item.getUrl ? item.getUrl() : "",
              original_name: item.filename,
              _isImage: !/\.pdf$/i.test(item.filename || ""),
            },
            [],
          );
        },
      });
    }
    return kebabMenu(
      [
        ...items,
        {
          label: "ph:pencil-simple Rename",
          title: "Rename this image",
          run: async () => {
            const next = window.prompt("New name", item.filename || "");
            if (!next || !next.trim() || next === item.filename) return;
            try {
              const updated = await apiJson(`/media/${item.id}`, {
                method: "PUT",
                body: JSON.stringify({ original_name: next.trim() }),
              });
              item.filename = updated.original_name;
              renderInfo(item, true);
            } catch (err) {
              toast(err.message || "Couldn't rename that image.", true);
            }
          },
        },
        {
          label: "ph:trash Delete",
          title: "Delete this image",
          run: async () => {
            if (!(await confirmDialog(`Delete "${item.filename || "this image"}"?`))) return;
            try {
              await apiJson(`/media/${item.id}`, { method: "DELETE" });
              items.splice(index, 1);
              if (!items.length) {
                close();
                return;
              }
              show(index);
            } catch (err) {
              toast(err.message || "Couldn't delete that image.", true);
            }
          },
        },
      ],
      "More actions for this image"
    );
  };
  const syncMoreMenu = (item) => {
    moreMenu?.remove();
    // `!item.kind` matters here, not just belt-and-braces: a native
    // document preview item (below) also carries `item.id`, but that id
    // names a *document*, not a media upload, feeding it to
    // `/media/{id}/caption` or `/media/{id}` DELETE would act on whatever
    // media row happens to share that number, or 404. This menu is media-
    // actions only; `item.kind` is how a document identifies itself.
    moreMenu = item.id && !item.kind ? buildMoreMenu(item) : null;
    if (moreMenu) actions.appendChild(moreMenu);
  };


  // **The document half of the showcase.** Asked for directly: the lightbox
  // should be "a sort of document preview… for viewing pdfs, word documents,
  // spreadsheets, text files, code files etc but in a presentable way that
  // isn't editable".
  //
  // Read-only is not a shortcut here, `/media/text` returns *extracted*
  // text, so what is on screen has already stopped being a .docx and there
  // is nothing coherent to write back into. `core/docview.py`'s own module
  // docstring makes the same point.
  const doc = document.createElement("div");
  doc.className = "lightbox-doc hidden";
  const docBody = document.createElement("div");
  docBody.className = "lightbox-doc-body";
  const docNote = document.createElement("p");
  docNote.className = "muted lightbox-doc-note hidden";
  // A PDF's actual pages, rasterised server-side, direct instruction, after
  // the AI-extraction path alone left a scanned PDF stuck on "Reading…"
  // forever: "pdfs and documents should be viewable, accessible and
  // manageable without the ai, even if the ai cant read them." Plain
  // <img>s, one per page, in their own scrolling column so a PDF scrolls
  // like a PDF: no script, no PDF renderer, no AI in this path at all.
  const pdfPages = document.createElement("div");
  pdfPages.className = "lightbox-pdf-pages hidden";
  bindPan(pdfPages);
  //: Bound here rather than beside `noteDocPage` itself, and for the same
  //: reason `bindPan` exists: `doc` and `pdfPages` are created further down
  //: this function, so touching either from the block that defines the page
  //: stepper is a temporal-dead-zone ReferenceError the instant the lightbox
  //: opens. Bound once each, never rebound per document, a listener added on
  //: every `showDocument` is the unbounded accumulation
  //: `test_frontend_handlers.py` exists to catch.
  //:
  //: Both boxes, because which one scrolls depends on the layout (see
  //: `pageScroller`), and `noteDocPage` is a no-op when there are no pages.
  doc.addEventListener("scroll", noteDocPage, { passive: true });
  pdfPages.addEventListener("scroll", noteDocPage, { passive: true });
  trackScrolledAway(doc);
  //: **Editing a file in place** (REDESIGN.md §R7.1 item 2, and the request:
  //: *"all the files should be managable, viewable and editable in the
  //: library and document/file/text editor"*). A plain textarea over the
  //: file's own text, and only ever for the files where that text *is* the
  //: file: `docview.editability` decides, server-side, and the route
  //: re-checks rather than trusting the flag it sent.
  const docEdit = document.createElement("textarea");
  docEdit.className = "lightbox-doc-edit hidden";
  docEdit.spellcheck = false;
  docEdit.setAttribute("aria-label", "Edit this file's text");
  //: **The HTML preview pane** (§R7.1 item 4, from the odysseus comparison:
  //: *"viewing html and other code"*). An .html file is the one type where
  //: the source and the thing it describes are both worth looking at, and
  //: showing only the source is showing half the file.
  //:
  //: `sandbox` with **no** `allow-` tokens, and that is the whole security
  //: story: no scripts, no forms, no same-origin, no top-level navigation.
  //: The page renders as layout and can do nothing else, which is what makes
  //: it safe to point at a file nobody in this notebook wrote. `core/security`
  //: allows `frame-src blob:` for this; the sandbox is what bounds it.
  const docFrame = document.createElement("iframe");
  docFrame.className = "lightbox-doc-frame hidden";
  docFrame.setAttribute("sandbox", "");
  docFrame.setAttribute("title", "Preview of this HTML file");
  doc.append(docNote, docBody, docEdit, docFrame, pdfPages);
  doc.addEventListener("click", (e) => e.stopPropagation());
  stage.appendChild(doc);

  // Find within the document. Deliberately a filter over the rendered text
  // rather than the browser's own Ctrl+F: this panel scrolls inside a
  // dialog, and the native find has no idea the rest of the page is inert.
  const find = document.createElement("input");
  find.type = "search";
  find.className = "lightbox-find hidden";
  find.placeholder = "Find in document";
  find.setAttribute("aria-label", "Find in document");
  const findCount = document.createElement("span");
  findCount.className = "muted lightbox-find-count hidden";
  const clearFind = () => {
    find.value = "";
    findCount.textContent = "";
    docBody.querySelectorAll("mark.lightbox-hit").forEach((m) => {
      m.replaceWith(document.createTextNode(m.textContent));
    });
    docBody.normalize();
  };
  find.addEventListener("input", () => {
    // Unwrap previous hits before re-scanning, or each keystroke would
    // search text already split across <mark> boundaries.
    docBody.querySelectorAll("mark.lightbox-hit").forEach((m) => {
      m.replaceWith(document.createTextNode(m.textContent));
    });
    docBody.normalize();
    const needle = find.value.trim();
    if (!needle) {
      findCount.textContent = "";
      findCount.classList.add("hidden");
      return;
    }
    // Walk text nodes and wrap matches. Text-node surgery rather than an
    // innerHTML replace, which would corrupt the rendered markup and is the
    // classic way this feature introduces an injection bug.
    const lower = needle.toLowerCase();
    const walker = document.createTreeWalker(docBody, NodeFilter.SHOW_TEXT);
    const targets = [];
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue.toLowerCase().includes(lower)) targets.push(node);
    }
    let hits = 0;
    for (const textNode of targets) {
      const parts = textNode.nodeValue.split(new RegExp(`(${escapeForFind(needle)})`, "gi"));
      if (parts.length < 2) continue;
      const frag = document.createDocumentFragment();
      for (const part of parts) {
        if (part.toLowerCase() === lower) {
          const mark = document.createElement("mark");
          mark.className = "lightbox-hit";
          mark.textContent = part;
          frag.appendChild(mark);
          hits += 1;
        } else if (part) {
          frag.appendChild(document.createTextNode(part));
        }
      }
      textNode.replaceWith(frag);
    }
    findCount.textContent = hits ? `${hits} match${hits === 1 ? "" : "es"}` : "No matches";
    findCount.classList.remove("hidden");
    docBody.querySelector("mark.lightbox-hit")?.scrollIntoView({ block: "center" });
  });
  actions.append(find, findCount);

  // Which suffixes this viewer renders as a *picture*. Everything else that
  // reaches the lightbox is offered to the document reader instead.
  const IMAGE_SUFFIXES = /\.(png|jpe?g|gif|webp|avif|bmp|ico|svg)$/i;

  // Reassigned on every `showDocument` call: see `readWithAiBtn` above,
  // which is the only caller. A closure rather than a stored url string so
  // the "Read with AI" button always re-derives from whichever item and
  // text-endpoint are current, the same way `show(i)` already recomputes
  // everything else per item rather than caching it.
  let lightboxLoadExtractedText = null;

  async function showDocument(item, name, attachmentId) {
    img.classList.add("hidden");
    broken.classList.add("hidden");
    doc.classList.remove("hidden");
    docBody.replaceChildren();
    pdfPages.replaceChildren();
    pdfPages.classList.add("hidden");
    docNote.classList.add("hidden");
    readWithAiBtn.classList.add("hidden");
    //: A new file, so any half-finished edit of the previous one goes with
    //: it. Cleared *before* the fetch rather than after: the two buttons are
    //: on screen the whole time it is in flight, and Save on a stale target
    //: would write one file's text over another's.
    lightboxEditTarget = null;
    docEdit.value = "";
    setLightboxEditing(false);
    editFileBtn.classList.add("hidden");
    lightboxPreviewSource = null;
    lightboxExtractedText = null;
    lightboxOcrTarget = null;
    //: A new file, so the previous one's page count, stepper and read-chips go
    //: with it: the PDF branch below re-establishes them when there are pages.
    resetDocPages();
    exportTextBtn.classList.add("hidden");
    clearDocPreview();
    previewHtmlBtn.classList.add("hidden");
    clearFind();
    find.classList.remove("hidden");

    // A native MemoryMap document (the Documents list) or a real Attachment
    // row each has its own text/info endpoint; a `/media/` upload has a
    // third. All three converge on the same `AttachedFileTextOut` shape, so
    // everything past this point reads one variable rather than branching
    // three ways again and again.
    const textUrl = attachmentId
      ? `/files/${attachmentId}/text`
      : `/media/text/${encodeURIComponent(name)}`;
    const isPdf = /\.pdf$/i.test(item.filename || name || "");

    async function loadExtractedText() {
      // **The pages stay.** Reported directly: "when I select to read the
      // text from the document in a pdf, the pdf view disappears entirely. I
      // want the pdf view to be on one side, and the live extracted document
      // text and visuals on the right." Reading a scan *against* its pages is
      // the entire point: the text is a machine's reading of an image, and
      // hiding the image removes the only way to check it. So for a file
      // that has rendered pages, this becomes a split: pages left, text
      // right, both scrolling on their own. Anything without pages (a .docx,
      // a .txt) still gets the full width, because there is nothing to put
      // beside it.
      const hasPages = pdfPages.childElementCount > 0;
      doc.classList.toggle("lightbox-doc-split", hasPages);
      pdfPages.classList.toggle("hidden", !hasPages);
      docBody.classList.remove("hidden");
      find.classList.remove("hidden");
      showZoomControls(hasPages);
      if (!hasPages) setZoom(1);
      docBody.textContent = "Reading…";
      let payload = null;
      // See the doc-viewer comment block above `doc`'s own creation: a
      // native document already has its text, set by the Documents list's
      // "Preview" action: nothing to fetch.
      if (item.kind && item.text != null) {
        payload = { kind: item.kind, text: item.text, source: item.source || "file" };
      } else {
        try {
          payload = await apiJson(textUrl);
        } catch {
          payload = null;
        }
      }
      if (!payload) {
        docBody.textContent = "";
        docNote.textContent =
          "This file can't be previewed here. Use Save to open it in another app.";
        docNote.classList.remove("hidden");
        find.classList.add("hidden");
        return;
      }
      docBody.replaceChildren();
      const body = payload.text || "";
      //: **Decided before the empty-body return below, not after it.** A
      //: .docx on an install without markitdown extracts to nothing, so that
      //: return fires: and the read-only reason, which is exactly what such
      //: a file needs to say, used to be computed past it and never shown.
      //: Measured: the note read only "Importing documents needs the optional
      //: markitdown package", with no word about editing at all.
      //:
      //: **Preview is offered only for HTML**, and keyed off the *filename*
      //: rather than the extracted kind: docview reports `.html` as "code",
      //: which is right for how the source renders and says nothing about
      //: whether the file is a page. A .py is code too and has nothing to
      //: preview.
      if (body.trim()) {
        lightboxExtractedText = {
          name: item.filename || name || "document",
          kind: payload.kind,
          text: body,
        };
        exportTextBtn.classList.remove("hidden");
      }
      if (attachmentId && /\.html?$/i.test(item.filename || name || "") && body.trim()) {
        lightboxPreviewSource = `/files/${attachmentId}/html-preview`;
        previewHtmlBtn.classList.remove("hidden");
      }
      const editNotes = [];
      if (item.kind && item.text != null) {
        editFileBtn.classList.add("hidden");
      } else if (payload.editable) {
        lightboxEditTarget = { url: textUrl, text: body };
        editFileBtn.classList.remove("hidden");
      } else {
        editFileBtn.classList.add("hidden");
        if (payload.edit_message) editNotes.push(`Read-only: ${payload.edit_message}`);
      }
      if (!body.trim()) {
        docNote.textContent = [
          payload.message || "There's no readable text in this file.",
          ...editNotes,
        ].join(" · ");
        docNote.classList.remove("hidden");
        return;
      }
      if (payload.kind === "markdown") {
        // The same renderer documents and chat use, so a previewed .md
        // looks like the same app rather than a second idea of markdown.
        renderMarkdown(docBody, body);
      } else {
        // Code and plain text keep their own whitespace, which is most of
        // what makes them readable.
        const pre = document.createElement("pre");
        pre.className = "lightbox-doc-pre";
        const code = document.createElement("code");
        if (payload.kind === "code") {
          //: §R7.1 item 3. `highlightCodeInto` (editor.js) picks the language
          //: off the filename and builds spans with `textContent`, so a file
          //: cannot inject markup by being written to look like markup.
          highlightCodeInto(code, body, item.filename || name || "");
        } else {
          code.textContent = body;
        }
        pre.appendChild(code);
        docBody.appendChild(pre);
      }
      // `source` is shown, not just logged: text a vision model
      // transcribed off a scanned page is a *reading* of the file, and
      // presenting it identically to text read out of a .txt would state a
      // guess as fact.
      const notes = [];
      if (payload.source === "vision-ocr") notes.push("Text read off the page by a vision model");
      else if (payload.source === "converted") notes.push("Converted for preview");
      if (payload.truncated) notes.push("Long file: showing the beginning only");
      if (payload.message) notes.push(payload.message);
      //: **The reason a file cannot be edited, shown where it is read.** §R7.1
      //: item 2 asked for the honest reason in the UI rather than a control
      //: that quietly does nothing. Computed above, beside the button it
      //: belongs to; pushed here so it reads as one line with the rest.
      notes.push(...editNotes);
      docNote.textContent = notes.join(" · ");
      docNote.classList.toggle("hidden", !notes.length);
    }
    lightboxLoadExtractedText = loadExtractedText;

    // A native document is markdown from the database, there is no PDF
    // underneath it to rasterise, so it always takes the text path above.
    if (isPdf && !item.kind) {
      const infoUrl = attachmentId ? `/files/${attachmentId}/pdf-info` : `/media/pdf-info/${encodeURIComponent(name)}`;
      const pageUrl = (i) =>
        attachmentId ? `/files/${attachmentId}/pdf-page/${i}` : `/media/pdf-page/${encodeURIComponent(name)}/${i}`;
      let info = null;
      try {
        info = await apiJson(infoUrl);
      } catch {
        info = null;
      }
      if (info && info.available && info.pages > 0) {
        docBody.classList.add("hidden");
        find.classList.add("hidden"); // nothing here is text to search yet
        //: The identity the OCR workspace needs, built here because this is
        //: the one place that knows whether the open file is an attachment or
        //: a media upload. `original_name` rather than the stored name: the
        //: workspace's own `ocrIsPdf` tests the extension of exactly that.
        //: `url` matters as much as `id` for an upload: the workspace renders a
        //: page through `/media/pdf-page/{stored name}/{n}`, not by id, so a
        //: target without it asked for `/media/pdf-page//0` and got a 404, the
        //: workspace opened on an empty stage. Measured against the running app
        //: while wiring the "open at this page" route in; the attachment side
        //: has an id-addressed page endpoint and never hit it.
        lightboxOcrTarget = attachmentId
          ? { id: attachmentId, _isAttachment: true, original_name: item.filename || name }
          : item.id
          ? {
              id: item.id,
              _isAttachment: false,
              original_name: item.filename || name,
              url: `/media/${name}`,
            }
          : null;
        readWithAiBtn.classList.remove("hidden");
        pdfPages.classList.remove("hidden");
        // Zoom, same as the image view, reported live once pages actually
        // rendered: "or zoom. a lot of controls are missing." `setZoom(1)`
        // resets any leftover magnification from a previously viewed item;
        // `zoomTarget()`/`applyZoom` (above) already know to scale
        // `pdfPages` rather than `img` while this view is the one showing.
        showZoomControls(true);
        setZoom(1);
        for (let i = 0; i < info.pages; i++) {
          const pageImg = document.createElement("img");
          pageImg.className = "lightbox-pdf-page";
          pageImg.loading = "lazy";
          pageImg.alt = `Page ${i + 1} of ${info.pages}`;
          pageImg.src = mediaSrc(pageUrl(i));
          pdfPages.appendChild(pageImg);
        }
        //: **The document block** (Phase 7.1). The page count is known right
        //: here and nowhere else, so this is where the stepper, the chips and
        //: the facts line are told about it. The chips render immediately as
        //: "not read yet" and the stored readings fill them in when they
        //: arrive: a panel that waits for a request before showing the page
        //: count would leave the viewer blank for the one fact it already has.
        docPageCount = info.pages;
        docPage = 0;
        showPageControls(info.pages > 1);
        renderDocPages();
        //: `renderInfo`, not the inline copy in `show()`'s image path: a
        //: document reaches the early return below, so nothing else would ever
        //: draw the facts line for it. Reported as part of the same item, 
        //: "no sections or info are below it really compared to the images."
        renderInfo(item, true);
        loadDocPageReads(attachmentId, name, item).catch(() => {});
        return;
      }
      // pdfpages isn't installed, or this particular file can't be opened: 
      // `info.message` already says which. Fall through to the AI-text path
      // below, which gives the same honest message (docview.py's own
      // "couldn't be opened" vs. "probably a scan" split) rather than a
      // second, differently-worded dead end.
    }
    await loadExtractedText();
  }

  async function show(i) {
    index = (i + items.length) % items.length;
    const item = items[index];
    // **`Promise.resolve()`, not a bare `.catch()` on the call.** Found live,
    // not by reading: this crashed the entire lightbox, not just the new
    // document detection: for the Library's own gallery, whose `getUrl` is
    // `() => mediaSrc(i.url)`, a plain synchronous string return, not a
    // Promise. `.catch` does not exist on a string, so this threw
    // synchronously and no code past it in `show()` ever ran, including the
    // metadata panel that predates this change entirely. `await` on a
    // non-Promise already resolves fine (`show()`'s other two `getUrl()`
    // call sites never hit this); wrapping in `Promise.resolve()` first is
    // what makes `.catch()` safe to chain regardless of which shape a
    // caller returns.
    const rawUrl = await Promise.resolve(item.getUrl()).catch(() => "");
    const name = (/\/media\/([^/?#]+)/.exec(rawUrl || "") || [])[1] || "";
    // A note's own attached file (the `Attachment` model, `/files/{id}`), 
    // distinct from a `/media/{name}` upload, and until now the only file
    // shape the lightbox's document viewer could not read at all: it went
    // straight to a download instead. Same token-gated url shape `mediaSrc`
    // already handles; `showDocument` below is what learned to use it.
    const looksLikeImage =
      IMAGE_SUFFIXES.test(item.filename || "") || IMAGE_SUFFIXES.test(name);
    // A note's own attached file (the `Attachment` model, `/files/{id}`), 
    // distinct from a `/media/{name}` upload, and until now the only file
    // shape the lightbox's document viewer could not read at all: it went
    // straight to a download instead. Same token-gated url shape `mediaSrc`
    // already handles; `showDocument` below is what learned to use it.
    //
    // Gated on `!looksLikeImage`, matching the `name` case just below it, 
    // the comment here used to claim this was "only ever set for a
    // non-image /files/{id}", true only because nothing had ever opened an
    // *image* attachment through this lightbox yet. The Library gallery's
    // own Attachment rows (`renderLibraryImagesGallery`, library.js) changed
    // that: a photo attached to a note now reaches this same code path, and
    // without this guard it fell into the document viewer below, no PDF
    // pages, no image to show, `isPdf` false, straight to `loadExtractedText`
    // asking `/files/{id}/text` for a picture, "no readable text in this
    // file" for what should have been a plain zoomable image.
    const attachmentId = name || looksLikeImage
      ? ""
      : (/\/files\/(\d+)(?:[/?#]|$)/.exec(rawUrl || "") || [])[1] || "";
    // A native document (item.kind already set: see showDocument) has no
    // `/media/...` url to sniff at all; a caller that already declares
    // itself a document skips the filename guess entirely.
    if (item.kind || attachmentId || (name && !looksLikeImage)) {
      overlay.setAttribute("aria-label", item.filename || "Document preview");
      meta.textContent =
        items.length > 1
          ? `${item.filename || ""}, ${index + 1} of ${items.length}`
          : item.filename || "";
      actions.classList.remove("hidden");
      setZoom(1);
      showZoomControls(false);
      openDocBtn.classList.toggle("hidden", !item.documentId);
      syncMoreMenu(item);
      await showDocument(item, name, attachmentId);
      hydrate(index, item, true);
      return;
    }
    doc.classList.add("hidden");
    //: A picture is never a document, so paging from a previewed document to
    //: an image must take this away with the rest of the text controls.
    openDocBtn.classList.add("hidden");
    //: A picture has no text to edit, and leaving Edit/Save on the bar after
    //: paging from a .md to a .png would offer to write the note's markdown
    //: over an image. Cleared with the target, not just hidden.
    lightboxEditTarget = null;
    setLightboxEditing(false);
    editFileBtn.classList.add("hidden");
    lightboxPreviewSource = null;
    lightboxExtractedText = null;
    lightboxOcrTarget = null;
    //: A picture has no pages. Paging from a PDF to an image must take the
    //: stepper and the page chips with it, or the panel keeps offering "page 4
    //: of 9" for a photograph.
    resetDocPages();
    exportTextBtn.classList.add("hidden");
    clearDocPreview();
    previewHtmlBtn.classList.add("hidden");
    find.classList.add("hidden");
    findCount.classList.add("hidden");
    showZoomControls(true);
    img.alt = item.filename || "";
    img.src = rawUrl;
    // A failed decode used to be swallowed here, leaving a blank box with no
    // explanation: reported live as "the second page doesn't load" (an
    // image whose underlying file was gone, paged to from a gallery that
    // itself hides broken tiles, so the lightbox was the only place the
    // failure was ever visible, and it said nothing). Now it says so.
    const ok = await img.decode().then(
      () => true,
      () => false
    );
    img.classList.toggle("hidden", !ok);
    broken.classList.toggle("hidden", ok);
    if (!ok) broken.textContent = `Couldn't load "${item.filename || "this image"}", the file may have been deleted.`;
    overlay.setAttribute("aria-label", item.filename || "Image preview");
    meta.textContent =
      items.length > 1
        ? `${item.filename || ""}, ${index + 1} of ${items.length}`
        : item.filename || "";
    const caption = (item.caption || "").trim();
    const text = (item.text || "").trim();
    infoCaption.textContent = caption;
    infoCaption.classList.toggle("hidden", !caption);
    infoCaptionByline.textContent = caption ? item.captionByline || "" : "";
    infoCaptionByline.classList.toggle("hidden", !caption || !item.captionByline);
    infoText.textContent = text;
    infoText.classList.toggle("hidden", !text);
    infoByline.textContent = item.byline || "";
    infoByline.classList.toggle("hidden", !item.byline);
    renderAltReading(item.altText, item.altByline);
    syncReadingDeletes(item, { text, alt: (item.altText || "").trim() });
    info.classList.toggle("hidden", !caption && !text && !item.filename);
    // The picture's own facts, which the app knew and never showed. Asked
    // for: "maybe it can have the image information and other info about it
    // below the image with the caption and ocr text??" Dimensions come from
    // the decoded image rather than from the server, it is the one fact the
    // browser already has and the API does not carry.
    const facts = [];
    if (ok && img.naturalWidth) facts.push(`${img.naturalWidth} × ${img.naturalHeight}`);
    if (item.addedAt) {
      const when = new Date(item.addedAt);
      if (!Number.isNaN(when.valueOf())) facts.push(`Added ${when.toLocaleDateString()}`);
    }
    if (item.filename) facts.push(item.filename);
    infoFacts.textContent = facts.join("  ·  ");
    infoFacts.classList.toggle("hidden", !facts.length);
    // Paging to another picture starts it at fit, the same way opening one
    // does: carrying a 400% zoom onto the next image lands you somewhere
    // arbitrary in a picture you have not seen yet.
    setZoom(1);
    copyBtn.classList.toggle("hidden", !text);
    // Nothing to act on when the file itself failed to load.
    actions.classList.toggle("hidden", !ok);
    syncMoreMenu(item);

    // **Fill in whatever the caller did not know.** Reported directly: the
    // caption, OCR text and facts appeared in the Image Gallery and nowhere
    // else. The lightbox was never the problem, this metadata arrived as
    // *arguments*, and of nine callers only the gallery holds a full media
    // row to pass. Everywhere else (a note attachment, a chat image, a graph
    // or dashboard thumbnail, a whiteboard object) has a url and a name, so
    // the panel below the picture stayed empty on the same picture that
    // showed a full description one tab over.
    //
    // Asking the server closes that gap in one place instead of nine, and
    // covers callers added later without them having to know to pass
    // anything. Only ever *fills*: a caller that did pass a caption keeps
    // the one it passed, so the gallery's own (possibly just-edited,
    // not-yet-saved) values still win.
    hydrate(index, item, ok);
  }

  // Looked up once per filename per lightbox, then remembered: paging back
  // and forth across a gallery would otherwise refetch the same rows.
  const metaCache = new Map();
  async function hydrate(forIndex, item, ok) {
    if (item.caption && item.text && item.addedAt) return;
    let url;
    try {
      url = await item.getUrl();
    } catch {
      return;
    }
    // `/media/<stored name>`, possibly with a query string (an address
    // saved before 2026-09-24 can still carry one), which is not part of the
    // name.
    const match = /\/media\/([^/?#]+)/.exec(url || "");
    if (!match) return;
    const name = match[1];
    if (!metaCache.has(name)) {
      metaCache.set(
        name,
        apiJson(`/media/meta/${encodeURIComponent(name)}`).catch(() => null)
      );
    }
    const row = await metaCache.get(name);
    // Not an error worth surfacing: plenty of images in this app are not
    // `MediaUpload` rows at all (a sketch rendered straight to a data url,
    // a file whose row was deleted out from under a note that still links
    // it). No metadata simply means no panel, exactly as before.
    if (!row) return;
    // The picture may have been paged away from while this was in flight.
    if (forIndex !== index) return;

    const readings = lightboxReadingsFor(row);
    if (!item.caption && row.caption) item.caption = row.caption;
    if (row.id && !item.metaId) item.metaId = row.id;
    if (!item.text) {
      item.text = readings.text;
      item.textSource = readings.textSource;
    }
    if (!item.addedAt && row.created_at) item.addedAt = row.created_at;
    if (!item.byline) item.byline = readings.byline;
    //: The alternate is filled whenever the row has one, rather than only when
    //: the item arrived without it: a caller that passed a reading but knew
    //: nothing of the second one (every caller with a bare url) would otherwise
    //: keep the panel one reading short for the whole visit.
    if (!item.altText) {
      item.altText = readings.altText;
      item.altByline = readings.altByline;
      item.altSource = readings.altSource;
    }
    if (!item.captionByline) item.captionByline = captionBylineFor(row);
    // The gallery passes `original_name`; a bare url caller passes the
    // stored name or nothing, and the human-readable one is better.
    if (row.original_name && (!item.filename || item.filename === name)) {
      item.filename = row.original_name;
    }
    renderInfo(item, ok);
  }

  // The half of `show()` that draws the panel, split out so `hydrate` can
  // redraw it once the answer arrives without re-running the image load.
  //: Which item the info panel was last drawn for, so a page change can redraw
  //: it without `show()` having to hand the item down through the stepper.
  let lightboxInfoItem = null;

  function renderInfo(item, ok) {
    lightboxInfoItem = item;
    //: **For a document, the panel is about the page on screen** (Phase 7.3).
    //: The file-level values are one caption for a whole PDF, which describes
    //: none of its pages, and the *joined* reading of every page, which is
    //: not what you are looking at when page 4 is up. `docPageRows` has both,
    //: per page, from the `PageRead` store; a page with neither falls back to
    //: the file's own values so nothing that used to show now disappears.
    const row = docPageCount ? docPageRows.get(docPage) : null;
    const perPage = Boolean(row && (row.text || row.caption));
    const caption = perPage ? row.caption : (item.caption || "").trim();
    const text = perPage ? row.text : (item.text || "").trim();
    const captionByline = perPage
      ? row.caption_model
        ? `Figures on page ${docPage + 1}, described by ${shortModelName(row.caption_model)}`
        : ""
      : item.captionByline || "";
    const byline = perPage
      ? row.model
        ? `Page ${docPage + 1}, read by ${shortModelName(row.model)}`
        : row.text
          ? `Page ${docPage + 1}`
          : ""
      : item.byline || "";
    //: What Copy hands over has to be what is on screen: copying every page's
    //: reading while the panel shows one page's is the app disagreeing with
    //: itself about what "this text" means.
    lightboxShownText = text;
    infoCaption.textContent = caption;
    infoCaption.classList.toggle("hidden", !caption);
    infoCaptionByline.textContent = caption ? captionByline : "";
    infoCaptionByline.classList.toggle("hidden", !caption || !captionByline);
    infoText.textContent = text;
    infoText.classList.toggle("hidden", !text);
    infoByline.textContent = byline;
    infoByline.classList.toggle("hidden", !byline);
    //: Not on a page of a document: `docPageRows` holds one reading per page
    //: (`PageRead`), so there is no second reader to footnote there, and the
    //: file-level alternate would be a claim about the whole PDF sitting under
    //: page 4's own text.
    renderAltReading(perPage ? "" : item.altText, item.altByline);
    syncReadingDeletes(item, { text, alt: perPage ? "" : (item.altText || "").trim(), perPage });
    info.classList.toggle("hidden", !caption && !text && !item.filename);
    meta.textContent =
      items.length > 1
        ? `${item.filename || ""}, ${index + 1} of ${items.length}`
        : item.filename || "";
    const facts = [];
    //: A document's dimensions are its *pages*, and the picture's pixel size
    //: is meaningless for one, `docPageCount` is 0 for anything that is not a
    //: rendered PDF, so an image is unaffected.
    if (docPageCount) {
      facts.push(`${docPageCount} page${docPageCount === 1 ? "" : "s"}`);
      facts.push(
        docPagesRead.size
          ? `${docPagesRead.size} read`
          : "none read yet"
      );
    } else if (ok && img.naturalWidth) {
      facts.push(`${img.naturalWidth} × ${img.naturalHeight}`);
    }
    if (item.addedAt) {
      const when = new Date(item.addedAt);
      if (!Number.isNaN(when.valueOf())) facts.push(`Added ${when.toLocaleDateString()}`);
    }
    if (item.filename) facts.push(item.filename);
    infoFacts.textContent = facts.join("  ·  ");
    infoFacts.classList.toggle("hidden", !facts.length);
    copyBtn.classList.toggle("hidden", !text);
    copyBtn.title = perPage
      ? `Copy the text read from page ${docPage + 1}`
      : "Copy the text read from this image";
  }

  const close = () => {
    overlay.remove();
    document.removeEventListener("keydown", onKey);
  };
  const onKey = (e) => {
    if (e.key === "Escape") close();
    else if (e.key === "ArrowLeft" && items.length > 1) show(index - 1);
    else if (e.key === "ArrowRight" && items.length > 1) show(index + 1);
  };
  // Only empty space closes on click, the picture, the metadata and the
  // nav/close buttons all need to stay clickable without dismissing the
  // dialog they sit inside. The three layout boxes named here have no content
  // of their own: the column is full-window-width and only as tall as the
  // picture, so without them the entire band left and right of the image was
  // dead to a dismissing click. See `wireBackdropClose`.
  wireBackdropClose(overlay, close, ".lightbox-column, .lightbox-stage-wrap, .lightbox-stage");
  closeBtn.addEventListener("click", close);
  prevBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    show(index - 1);
  });
  nextBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    show(index + 1);
  });
  document.addEventListener("keydown", onKey);

  stage.append(img, broken);
  // **The arrows must not live inside the stage.** The stage scrolls now
  // (zoom needs it to, so a magnified picture can be panned to its edges),
  // and an absolutely-positioned child of a scrolling box scrolls with its
  // content: so the arrows drifted off-centre and away from the edges the
  // moment anything overflowed. Reported live: "completely off, different
  // distances from the edge of the screen, at different heights, and not
  // even aligned."
  //
  // A non-scrolling wrapper holds both: the stage scrolls inside it, the
  // arrows are positioned against it, and because the wrapper is exactly
  // the stage's box, `top: 50%` is still the middle of the picture, which
  // is the property the note on `.lightbox-nav` says two earlier attempts
  // lost.
  const stageWrap = document.createElement("div");
  stageWrap.className = "lightbox-stage-wrap";
  stageWrap.appendChild(stage);
  //: `lightbox-paged` narrows the stage by the arrows' room, so the picture
  //: never goes under one (02-chat-graph.css).
  if (items.length > 1) {
    stageWrap.append(prevBtn, nextBtn);
    stageWrap.classList.add("lightbox-paged");
  }
  const column = document.createElement("div");
  column.className = "lightbox-column";
  column.append(stageWrap, meta, actions, info);
  overlay.append(closeBtn, column);
  document.body.appendChild(overlay);
  closeBtn.focus();
  //: `.then`, not `await`: `openLightbox` is not async and its nine callers
  //: do not expect it to be. The dialog is already on screen and interactive
  //: by the time this resolves; all that is left is where to point the reader.
  Promise.resolve(show(startIndex)).then(() => {
    if (!opts.focusReading) return;
    //: Start on the first page that actually has a reading. Page 1 of a scan
    //: is often a cover, and "open the reading" landing on a page with none is
    //: the same disappointment as not opening it at all.
    if (docPageCount && docPagesRead.size) {
      setDocPage(Math.min(...docPagesRead));
    }
    //: `block: "end"` because the panel sits *under* the file: bringing its
    //: bottom into view is what puts the reading on screen, where "nearest"
    //: would decide it is already close enough and do nothing.
    info.scrollIntoView({ block: "end" });
    //: Focus follows the eye. `-1` so it is a destination rather than another
    //: stop on the way through the dialog's own controls.
    infoText.tabIndex = -1;
    infoText.focus();
  });
}

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
