// === EDITOR LAYER ===========================================================
// The "/" menu, the block frames it inserts, and the caret-anchored popup both
// it and the document's own [[ autocomplete are drawn with.
//
// Why this is a separate file rather than more of app.js: app.js is ~27k lines
// and ROADMAP Tier 4 makes the case — correctly — that a big-bang split must
// not share a diff with live edits to the same code. New code in a new file
// moves the line the right way without that risk, the same way graph.js and
// whiteboard.js already did. Loaded after app.js (see index.html), so every
// global it leans on — $, apiJson, allEntries, MD_ACTIONS, markDocDirty,
// renderDocPreview, BUILTIN_TEMPLATES, prefsCache, noteLabel, toast — is
// already defined.
//
// Two design decisions worth stating up front, because both were the cheap
// option *and* the correct one:
//
// 1. **One delegated listener, not one per textarea.** Every handler here is
//    bound once on `document` and dispatches on `event.target`. Binding
//    per-element would have meant a third `input` listener on `entry-content`
//    (it already legitimately has two — see ALLOWED_DOUBLES in
//    tests/test_frontend_handlers.py) and a fresh entry in that allow-list for
//    every surface added later. Delegation is how "one behaviour across many
//    inputs" is supposed to be written, and it means a new editor surface is
//    one line in EDITOR_SURFACES rather than a wiring change.
//
// 2. **Callouts are `> [!kind] Title`, not a custom fence.** That syntax
//    degrades to an ordinary blockquote in any other markdown reader —
//    GitHub, Obsidian and Typora all already understand it. A custom fence
//    would render as literal junk the moment a note left this app, and
//    "your notes stay portable" is the whole premise of a local-first
//    notebook that stores plain markdown.

// Which textareas get the "/" menu, and what each one is allowed to do. The
// value is the context: an AI command that acts on a document has nowhere to
// run inside the capture box, so commands declare which contexts they suit
// and the menu filters rather than offering something that would no-op.
const EDITOR_SURFACES = {
  "entry-content": "note",
  //: The note *edit* form (app.js's `renderEditForm`), which had none of this
  //: until now — the one editing surface in the app with no "/" menu, no
  //: toolbar and no selection bar. One id, because `editingId` allows exactly
  //: one open edit form at a time.
  "entry-edit-content": "note",
  "doc-content": "document",
};

// The callout kinds, their icon and their accessible label. Kept as data
// because three things read it: the "/" menu builds a command per kind, the
// renderer maps a parsed kind onto an icon, and the CSS keys a colour off
// `.callout-{kind}`. A kind added here needs a matching CSS block and nothing
// else.
const CALLOUT_KINDS = {
  note: { icon: "\u{1F4DD}", label: "Note" },
  tip: { icon: "\u{1F4A1}", label: "Tip" },
  info: { icon: "\u{2139}\u{FE0F}", label: "Info" },
  warning: { icon: "\u{26A0}\u{FE0F}", label: "Warning" },
  danger: { icon: "\u{1F6D1}", label: "Danger" },
  question: { icon: "\u{2753}", label: "Question" },
  quote: { icon: "\u{201C}", label: "Quote" },
  todo: { icon: "\u{2705}", label: "To do" },
};

// ---------------------------------------------------------------------------
// Inserting text into an arbitrary textarea
//
// app.js's applyMarkdown() does exactly this job already, but it is hard-wired
// to $("doc-content") — it reads the box, and it calls markDocDirty() and
// renderDocPreview() unconditionally. Rather than duplicate its action table
// (MD_ACTIONS is reused verbatim below), this is the same four insertion
// shapes parameterised by which box to act on, plus a host-notification step
// that does the right thing for whichever surface it landed in.
// ---------------------------------------------------------------------------

// Tell the surrounding app that a textarea's value changed under it.
//
// This is the step that is easy to forget and silent when missed: the capture
// box's character count and localStorage draft both hang off its `input`
// event, and the document's autosave hangs off markDocDirty(). Writing
// `.value` from script fires neither — so a note inserted through this menu
// would look right, count wrong, and never be saved as a draft.
function editorNotifyHost(textarea) {
  if (textarea.id === "doc-content") {
    markDocDirty();
    renderDocPreview();
    return;
  }
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  // The capture box grows with its content; a scripted write has to ask.
  if (typeof autoGrow === "function" && textarea.classList.contains("autogrow")) {
    autoGrow(textarea);
  }
}

// Replace [start, end) with `text`, then place the caret. `select` picks which
// slice of the inserted text ends up selected, so a placeholder can be typed
// straight over — the behaviour wrapDocSelection() already establishes for the
// formatting toolbar, kept identical here so the two feel like one editor.
function editorSplice(textarea, start, end, text, select) {
  const value = textarea.value;
  textarea.value = value.slice(0, start) + text + value.slice(end);
  if (select) {
    textarea.setSelectionRange(start + select.from, start + select.to);
  } else {
    const caret = start + text.length;
    textarea.setSelectionRange(caret, caret);
  }
  textarea.focus();
  editorNotifyHost(textarea);
}

// Apply one MD_ACTIONS-shaped action to any textarea.
//
// The shapes (wrap / line / block / insert) are app.js's, deliberately: the
// formatting toolbar and this menu must not drift into two dialects of the
// same markdown. Anything the toolbar can insert, "/" can insert identically.
function editorApplyAction(textarea, action) {
  const { selectionStart: start, selectionEnd: end, value } = textarea;
  const selected = value.slice(start, end);

  if (action.wrap) {
    const body = selected || action.placeholder || "";
    const text = action.wrap + body + action.wrap;
    editorSplice(textarea, start, end, text, {
      from: action.wrap.length,
      to: action.wrap.length + body.length,
    });
    return;
  }
  if (action.line) {
    // Prefix the selected lines, or the current one when nothing is selected.
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const tail = value.slice(end).indexOf("\n");
    const lineEnd = tail === -1 ? value.length : end + tail;
    const target = value.slice(lineStart, Math.max(lineEnd, end));
    const prefixed = target
      .split("\n")
      .map((line) => (line.startsWith(action.line) ? line : action.line + line))
      .join("\n");
    editorSplice(textarea, lineStart, Math.max(lineEnd, end), prefixed, {
      from: 0,
      to: prefixed.length,
    });
    return;
  }
  if (action.block) {
    const body = selected || action.placeholder || "";
    const text = action.block + body + (action.suffix || "");
    editorSplice(textarea, start, end, text, {
      from: action.block.length,
      to: action.block.length + body.length,
    });
    return;
  }
  if (action.insert) {
    editorSplice(textarea, start, end, action.insert);
  }
}

//: **The shapes `editorApplyAction` does not implement.**
//:
//: MD_ACTIONS is bigger than the four shapes above: `custom` (image, footnote,
//: link, indent, undo…) and `pre`/`post` (the HTML-ish sup/sub/underline/
//: comment) are both handled by `applyMarkdown` in documents.js and by nothing
//: here. A "/" command wired straight to one of those through
//: `editorApplyAction` matches no branch and returns silently — this repo's
//: "a policy silently refusing the work" shape, and it would have shipped as
//: three menu rows that do nothing.
//:
//: `applyMarkdown` takes a box id and every editor surface has one (including
//: each live-view block, which is why `docLiveEditor` sets one), so this is a
//: call rather than a second implementation for the two to drift apart.
function editorApplyNamed(textarea, kind) {
  if (typeof applyMarkdown === "function" && textarea.id) {
    applyMarkdown(kind, textarea.id);
    return;
  }
  editorApplyAction(textarea, (typeof MD_ACTIONS === "object" && MD_ACTIONS[kind]) || {});
}

// A callout block, ready to type into.
//
// Every line of the body needs its own "> " — a blockquote ends at the first
// line that does not start with one, so a two-line callout written without the
// prefix on line two silently becomes a one-line callout followed by a
// paragraph. Getting that wrong is invisible until it renders.
function calloutTemplate(kind, fold = "") {
  const meta = CALLOUT_KINDS[kind] || CALLOUT_KINDS.note;
  return {
    block: `\n> [!${kind}]${fold} ${meta.label}\n> `,
    suffix: "\n",
    placeholder: "What matters about this?",
  };
}

// ---------------------------------------------------------------------------
// The command table
// ---------------------------------------------------------------------------

// `contexts` omitted means "everywhere". `keywords` exists so that typing
// "warn", "box" or "frame" finds the warning callout — the user asked for
// "specialised boxes and frames", which is nobody's idea of the word
// "callout", and a menu you can only search by its internal vocabulary is a
// menu you have to already know.
function editorCommands(context) {
  const commands = [];

  for (const [kind, meta] of Object.entries(CALLOUT_KINDS)) {
    commands.push({
      id: `callout-${kind}`,
      group: "Blocks & frames",
      // Eight callout kinds would fill the whole menu on their own and push
      // Links, AI and Templates below the fold — which is exactly what a live
      // browser check caught. Four show by default; typing finds the rest.
      primary: ["note", "tip", "warning", "danger"].includes(kind),
      label: `${meta.icon} ${meta.label} box`,
      hint: `> [!${kind}]`,
      keywords: ["callout", "box", "frame", "admonition", kind, meta.label],
      run: (textarea) => editorApplyAction(textarea, calloutTemplate(kind)),
    });
  }

  // **Typed collapsible blocks** — REDESIGN.md §R7.3 item 3, and the last
  // piece of it. Asked for directly: "I want the structured note features and
  // elements from kortex with the slash commands to be rendered and easier
  // for the user to use."
  //
  // One command rather than eight more (a foldable variant of every callout
  // kind would double this menu, which a live browser check already caught
  // once as pushing Links and Templates below the fold). The kind is easy to
  // change afterwards — it is one word in the text — and "fold this away" is
  // the thing being asked for, not "fold this away, in orange".
  commands.push({
    id: "callout-fold",
    primary: true,
    group: "Blocks & frames",
    label: "\u{1F4C1} Collapsible section",
    hint: "> [!note]- — folded until clicked",
    keywords: ["fold", "collapse", "collapsible", "toggle", "details", "section", "hide"],
    run: (textarea) => editorApplyAction(textarea, calloutTemplate("note", "-")),
  });

  commands.push(
    {
      id: "table",
      primary: true,
      group: "Blocks & frames",
      label: "\u{1F4CA} Table",
      hint: "3 columns",
      keywords: ["table", "grid", "columns"],
      run: (textarea) => editorApplyAction(textarea, MD_ACTIONS.table),
    },
    {
      id: "codeblock",
      primary: true,
      group: "Blocks & frames",
      label: "\u{1F4BB} Code block",
      hint: "```",
      keywords: ["code", "fence", "snippet"],
      run: (textarea) => editorApplyAction(textarea, MD_ACTIONS.codeblock),
    },
    {
      id: "checklist",
      primary: true,
      group: "Blocks & frames",
      label: "\u{2611}\u{FE0F} Checklist",
      hint: "- [ ]",
      keywords: ["task", "todo", "check", "list"],
      run: (textarea) => editorApplyAction(textarea, MD_ACTIONS.task),
    },
    {
      id: "bullets",
      group: "Blocks & frames",
      label: "\u{2022} Bullet list",
      hint: "-",
      keywords: ["list", "bullet", "ul"],
      run: (textarea) => editorApplyAction(textarea, MD_ACTIONS.ul),
    },
    {
      id: "divider",
      primary: true,
      group: "Blocks & frames",
      label: "\u{2014} Divider",
      hint: "---",
      keywords: ["divider", "rule", "hr", "separator", "break"],
      run: (textarea) => editorApplyAction(textarea, MD_ACTIONS.hr),
    },
    {
      id: "heading",
      primary: true,
      group: "Blocks & frames",
      label: "\u{1F516} Section heading",
      hint: "## — becomes a jump target",
      keywords: ["heading", "section", "anchor", "title", "h2"],
      run: (textarea) => editorApplyAction(textarea, MD_ACTIONS.h2),
    },
    //: **The rest of the block vocabulary.** The toolbar has had these since
    //: the Obsidian-toolbar pass; the "/" menu had a subset, which makes the
    //: two disagree about what the editor can do — and "/" is the one people
    //: reach for once they stop reading the toolbar. Every one of them runs
    //: the same MD_ACTIONS entry the toolbar button runs, so there is no
    //: second dialect of the markdown to keep in step.
    {
      id: "h1",
      group: "Blocks & frames",
      label: "\u{1F5DE}\u{FE0F} Title heading",
      hint: "#",
      keywords: ["h1", "title", "heading", "big"],
      run: (textarea) => editorApplyAction(textarea, MD_ACTIONS.h1),
    },
    {
      id: "h3",
      group: "Blocks & frames",
      label: "\u{1F4D1} Sub-heading",
      hint: "###",
      keywords: ["h3", "sub", "heading", "small"],
      run: (textarea) => editorApplyAction(textarea, MD_ACTIONS.h3),
    },
    {
      id: "numbered",
      group: "Blocks & frames",
      label: "\u{1F522} Numbered list",
      hint: "1.",
      keywords: ["ordered", "numbered", "list", "ol", "steps"],
      run: (textarea) => editorApplyAction(textarea, MD_ACTIONS.ol),
    },
    {
      id: "quote",
      group: "Blocks & frames",
      label: "\u{201C} Quote",
      hint: ">",
      keywords: ["quote", "blockquote", "cite"],
      run: (textarea) => editorApplyAction(textarea, MD_ACTIONS.quote),
    }
  );

  // --- links & references ---
  commands.push(
    {
      id: "wikilink",
      primary: true,
      group: "Links & references",
      label: "\u{1F517} Link to a note",
      hint: "[[…]]",
      keywords: ["link", "note", "wiki", "reference", "connect"],
      // Insert the opening brackets and hand straight over to the [[ menu,
      // so "/" and "[[" are one continuous gesture rather than two lookups.
      run: (textarea) => {
        editorApplyAction(textarea, { insert: "[[" });
        editorOpenMenu(textarea, "[[");
      },
    },
    {
      id: "embed",
      primary: true,
      group: "Links & references",
      label: "\u{1F4CE} Embed a note inline",
      hint: "![[…]] — shows its text here",
      keywords: ["embed", "transclude", "include", "inline", "note"],
      run: (textarea) => {
        editorApplyAction(textarea, { insert: "![[" });
        editorOpenMenu(textarea, "[[");
      },
    },
    {
      id: "image",
      group: "Links & references",
      label: "\u{1F5BC}\u{FE0F} Image",
      hint: "![alt](url) — or paste a file into the editor",
      keywords: ["image", "picture", "photo", "figure", "screenshot"],
      run: (textarea) => editorApplyNamed(textarea, "image"),
    },
    {
      id: "footnote",
      group: "Links & references",
      label: "\u{1F4CC} Footnote",
      hint: "[^1] — with its text at the foot",
      keywords: ["footnote", "reference", "cite", "aside"],
      run: (textarea) => editorApplyNamed(textarea, "footnote"),
    },
    {
      id: "comment",
      group: "Links & references",
      label: "\u{1F576}\u{FE0F} Private comment",
      hint: "%%…%% — kept in the file, never rendered",
      keywords: ["comment", "private", "hidden", "todo", "note to self"],
      run: (textarea) => editorApplyNamed(textarea, "comment"),
    },
    {
      id: "weblink",
      primary: true,
      group: "Links & references",
      label: "\u{1F310} Web link",
      hint: "[text](url)",
      keywords: ["url", "web", "href", "external"],
      run: (textarea) => {
        const { selectionStart: s, selectionEnd: e, value } = textarea;
        const label = value.slice(s, e) || "link text";
        editorSplice(textarea, s, e, `[${label}](https://)`, {
          from: label.length + 3,
          to: label.length + 11,
        });
      },
    }
  );

  // --- AI actions ---
  // Document-only, because these route to the document editor's own AI panel
  // and extract-notes preview. Offering them in the capture box would open a
  // panel pointed at whatever document happened to be loaded — acting on text
  // the user cannot see is worse than not offering the command.
  if (context === "document") {
    commands.push(
      {
        id: "ai-edit",
      primary: true,
        group: "AI",
        label: "\u{2728} AI edit this selection",
        hint: "rewrite, expand, tighten",
        keywords: ["ai", "rewrite", "improve", "expand", "edit"],
        run: () => $("doc-ai")?.click(),
      },
      {
        id: "ai-extract",
      primary: true,
        group: "AI",
        label: "\u{2702}\u{FE0F} Extract notes from here",
        hint: "split into linked notes",
        keywords: ["ai", "extract", "split", "notes"],
        run: () => $("doc-extract")?.click(),
      }
    );
  }

  // --- templates & stamps ---
  const now = new Date();
  commands.push(
    {
      id: "stamp-date",
      primary: true,
      group: "Templates",
      label: "\u{1F4C5} Today's date",
      hint: now.toLocaleDateString(),
      keywords: ["date", "today", "stamp"],
      run: (textarea) => editorApplyAction(textarea, { insert: now.toLocaleDateString() }),
    },
    {
      id: "stamp-time",
      group: "Templates",
      label: "\u{1F551} Time now",
      hint: now.toLocaleTimeString(),
      keywords: ["time", "now", "stamp", "clock"],
      run: (textarea) =>
        editorApplyAction(textarea, {
          insert: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }),
    }
  );

  // The user's own templates first, then the built-ins — the same "yours
  // before ours" ordering loadTemplates() already uses for the dropdown.
  const custom = (typeof prefsCache !== "undefined" && prefsCache?.custom_templates) || [];
  const builtin = typeof BUILTIN_TEMPLATES !== "undefined" ? BUILTIN_TEMPLATES : [];
  for (const template of [...custom, ...builtin]) {
    if (!template?.name || !template?.content) continue;
    commands.push({
      id: `template-${template.name}`,
      group: "Templates",
      label: `\u{1F4C4} ${template.name}`,
      hint: "template",
      keywords: ["template", template.name],
      run: (textarea) =>
        editorApplyAction(textarea, {
          // Same {date} substitution applyTemplate() does, so a template
          // behaves identically whichever way it was reached.
          insert: template.content.replace("{date}", now.toLocaleDateString()),
        }),
    });
  }

  return commands;
}

// ---------------------------------------------------------------------------
// The popup itself
// ---------------------------------------------------------------------------

const editorMenuState = {
  open: false,
  textarea: null,
  trigger: null, // "/" or "[["
  items: [],
  index: 0,
  start: 0, // index in textarea.value where the trigger token begins
};

// Where the caret is, in page coordinates.
//
// A textarea gives no caret geometry at all, so the standard answer is to
// build an invisible div with the same text metrics, put a marker where the
// caret is, and measure that. It is more code than anchoring the menu under
// the box would be — which is what the existing [[ suggest does — but the
// document editor's textarea is most of the screen, and a menu that opens
// hundreds of pixels from the caret reads as unrelated to what you just typed.
function editorCaretPoint(textarea) {
  const mirror = document.createElement("div");
  const style = getComputedStyle(textarea);
  // Everything that affects where a glyph lands has to be copied, or the
  // mirror wraps differently and the marker ends up on the wrong line.
  for (const property of [
    "boxSizing", "width", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
    "fontFamily", "fontSize", "fontWeight", "fontStyle", "letterSpacing",
    "lineHeight", "textTransform", "wordSpacing", "textIndent", "whiteSpace",
  ]) {
    mirror.style[property] = style[property];
  }
  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.overflowWrap = "break-word";
  mirror.style.top = "0";
  mirror.style.left = "-9999px";

  const upto = textarea.value.slice(0, textarea.selectionStart);
  mirror.textContent = upto;
  const marker = document.createElement("span");
  // A zero-width span collapses and measures as nothing on some engines; a
  // non-breaking space is guaranteed to have a box to measure.
  marker.textContent = "​";
  mirror.appendChild(marker);
  document.body.appendChild(mirror);

  const box = textarea.getBoundingClientRect();
  const top = box.top + marker.offsetTop - textarea.scrollTop;
  const left = box.left + marker.offsetLeft - textarea.scrollLeft;
  const lineHeight = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) * 1.4;
  mirror.remove();
  return { top, left, lineHeight };
}

// Put the menu at the caret, then pull it back on screen if it would hang off
// the bottom or the right — a menu you have to scroll the page to read is the
// same as no menu.
function editorPositionMenu(textarea) {
  const menu = $("editor-menu");
  const { top, left, lineHeight } = editorCaretPoint(textarea);
  menu.style.top = "0px";
  menu.style.left = "0px";
  const size = menu.getBoundingClientRect();
  const margin = 8;

  let y = top + lineHeight + 4;
  // Not enough room below: flip above the caret line instead of overflowing.
  if (y + size.height > window.innerHeight - margin) {
    const above = top - size.height - 4;
    y = above > margin ? above : Math.max(margin, window.innerHeight - size.height - margin);
  }
  const x = Math.max(margin, Math.min(left, window.innerWidth - size.width - margin));
  menu.style.top = `${Math.round(y)}px`;
  menu.style.left = `${Math.round(x)}px`;
}

function editorCloseMenu() {
  editorMenuState.open = false;
  editorMenuState.textarea = null;
  editorMenuState.items = [];
  $("editor-menu")?.classList.add("hidden");
}

// The half-typed token immediately before the caret, or null.
//
// "/" only counts at the start of a line or after whitespace, so "and/or",
// "24/7" and a URL never open the menu. "[[" can appear anywhere, because
// there is nothing else it could plausibly mean.
function editorTokenAt(textarea, trigger) {
  const upto = textarea.value.slice(0, textarea.selectionStart);
  const open = upto.lastIndexOf(trigger);
  if (open === -1) return null;
  const fragment = upto.slice(open + trigger.length);
  // A newline means they moved on and left the token behind.
  if (fragment.includes("\n")) return null;
  if (trigger === "[[" && upto.slice(open).includes("]]")) return null;
  if (trigger === "/") {
    const before = open === 0 ? "\n" : upto[open - 1];
    if (!/\s/.test(before)) return null;
    // A slash command is one word. Once a space is typed it is prose.
    if (/\s/.test(fragment)) return null;
  }
  return { start: open, fragment };
}

// Rank matches: a label that starts with what was typed beats one that merely
// contains it, which beats a keyword hit. Without the ordering, typing "no"
// offers "Bullet list" (it contains no "no"… but "Note box" and "Today's
// date" both match on keywords) in an order that looks arbitrary.
function editorRankCommands(commands, needle) {
  if (!needle) return commands;
  const query = needle.toLowerCase();
  const scored = [];
  for (const command of commands) {
    const label = command.label.toLowerCase();
    const keywords = (command.keywords || []).map((k) => String(k).toLowerCase());
    let score = -1;
    if (label.startsWith(query)) score = 0;
    else if (keywords.some((k) => k.startsWith(query))) score = 1;
    else if (label.includes(query)) score = 2;
    else if (keywords.some((k) => k.includes(query))) score = 3;
    if (score >= 0) scored.push({ command, score });
  }
  scored.sort((a, b) => a.score - b.score);
  return scored.map((s) => s.command);
}

// The notes a "[[" token could mean. Private notes are excluded for the same
// reason app.js's own [[ suggest excludes them: they cannot be link targets,
// so offering one is a dead end that also reveals it exists.
function editorLinkMatches(needle) {
  const query = (needle || "").trim().toLowerCase();
  const notes = (typeof allEntries !== "undefined" ? allEntries : [])
    .filter((e) => !e.is_private && (!query || (e.content || "").toLowerCase().includes(query)))
    .slice(0, 6)
    .map((entry) => ({
      id: `note-${entry.id}`,
      group: "Notes",
      label: noteLabel(entry, 60),
      hint: "note",
      // Link by the note's opening words — that is what resolution matches
      // on. Brackets are stripped first: a note that itself contains a
      // [[link]] would otherwise be inserted verbatim, and the parser would
      // then find the INNER brackets and resolve to the wrong note.
      value: (entry.content || "")
        .split("\n")[0]
        .replace(/\[\[|\]\]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 60),
    }))
    .filter((item) => item.value);

  // Documents are link targets too — that is Phase B's whole point, and it is
  // why this list is built here rather than reusing app.js's note-only one.
  const documents = (editorDocumentCache || [])
    .filter((doc) => !query || (doc.title || "").toLowerCase().includes(query))
    .slice(0, 4)
    .map((doc) => ({
      id: `doc-${doc.id}`,
      group: "Documents",
      label: doc.title || "Untitled",
      hint: "document",
      value: (doc.title || "").replace(/\[\[|\]\]/g, "").trim().slice(0, 60),
    }))
    .filter((item) => item.value);

  //: **Files and images**, the third and fourth kinds. They are not wiki-link
  //: targets — there is no name to resolve, only a url — so each carries the
  //: markdown it wants inserted (`item.markdown`, handled in `editorRunItem`):
  //: an embed for a picture, a plain link for anything else.
  const files = (editorFileCache || [])
    .filter((file) => !query || (file.original_name || "").toLowerCase().includes(query))
    .slice(0, 4)
    .map((file) => ({
      id: `file-${file._isAttachment ? "a" : "m"}-${file.id}`,
      group: file._isImage ? "Images" : "Files",
      label: file.original_name || "File",
      hint: file._isImage ? "image" : "file",
      markdown: `${file._isImage ? "!" : ""}[${(file.original_name || "file").replace(/[[\]]/g, "")}](${file.url})`,
    }));

  //: **Boards.** A board *is* an Entry (`is_board`), so it is already in
  //: `allEntries` — but it is filtered out of the notes list above by the
  //: same rule that keeps boards out of the note list everywhere else, and a
  //: notebook with boards had no way to link to one at all.
  const boards = (typeof allEntries !== "undefined" ? allEntries : [])
    .filter((e) => e.is_board && !e.is_private)
    .filter((e) => !query || (e.content || "").toLowerCase().includes(query))
    .slice(0, 3)
    .map((entry) => ({
      id: `board-${entry.id}`,
      group: "Boards",
      label: noteLabel(entry, 60),
      hint: "board",
      value: (entry.content || "")
        .split("\n")[0]
        .replace(/\[\[|\]\]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 60),
    }))
    .filter((item) => item.value);

  return [...notes, ...documents, ...boards, ...files];
}

//: The Library's own gallery payload, fetched once per menu session the same
//: way documents are — `/media` and `/files/gallery` are two calls, and doing
//: them per keystroke would put a request behind every letter typed.
let editorFileCache = null;

async function editorLoadFiles() {
  if (editorFileCache && editorFileCache.length) return;
  const [media, attachments] = await Promise.all([
    apiJson("/media", { silent: true }).catch(() => []),
    apiJson("/files/gallery", { silent: true }).catch(() => []),
  ]);
  const rows = [
    ...(Array.isArray(media) ? media : []).map((row) => ({ ...row, _isAttachment: false })),
    ...(Array.isArray(attachments) ? attachments : []).map((row) => ({
      ...row,
      _isAttachment: true,
      url: `/files/${row.id}`,
    })),
  ];
  //: `_isImage` decides embed-or-link, and it is decided here once rather
  //: than by each caller re-sniffing the extension — the same split
  //: `library.js` makes for the gallery.
  editorFileCache = rows.map((row) => ({
    ...row,
    _isImage: /\.(png|jpe?g|gif|webp|bmp|svg|avif|heic|heif|tiff?)$/i.test(row.original_name || ""),
  }));
}

// Documents are fetched once per menu session rather than per keystroke.
let editorDocumentCache = null;

function editorRenderMenu() {
  const menu = $("editor-menu");
  const { items, index } = editorMenuState;
  if (!items.length) return editorCloseMenu();

  menu.replaceChildren();
  let lastGroup = null;
  items.forEach((item, position) => {
    if (item.group && item.group !== lastGroup) {
      const heading = document.createElement("li");
      heading.className = "editor-menu-group";
      heading.setAttribute("role", "presentation");
      heading.textContent = item.group;
      menu.appendChild(heading);
      lastGroup = item.group;
    }
    const row = document.createElement("li");
    row.setAttribute("role", "option");
    row.setAttribute("aria-selected", String(position === index));
    row.className = "editor-menu-item";
    if (position === index) row.classList.add("active");

    const label = document.createElement("span");
    label.className = "editor-menu-label";
    label.textContent = item.label;
    row.appendChild(label);
    if (item.hint) {
      const hint = document.createElement("span");
      hint.className = "editor-menu-hint";
      hint.textContent = item.hint;
      row.appendChild(hint);
    }
    // mousedown, not click: the textarea must not lose focus first, or the
    // caret position the insertion depends on is already gone.
    row.addEventListener("mousedown", (event) => {
      event.preventDefault();
      editorRunItem(position);
    });
    menu.appendChild(row);
  });

  menu.classList.remove("hidden");
  editorPositionMenu(editorMenuState.textarea);
}

// Apply the highlighted item: drop the trigger token that summoned the menu,
// then let the item do its work at that spot.
function editorRunItem(position) {
  const { textarea, trigger, items } = editorMenuState;
  const item = items[position];
  if (!item || !textarea) return editorCloseMenu();

  const token = editorTokenAt(textarea, trigger);
  if (token) {
    // Remove "/table" (or "[[part") so the command's own text replaces it.
    const keep = trigger === "[[" ? token.start + trigger.length : token.start;
    textarea.value =
      textarea.value.slice(0, keep) + textarea.value.slice(textarea.selectionStart);
    textarea.setSelectionRange(keep, keep);
  }
  editorCloseMenu();

  if (item.markdown !== undefined) {
    //: **A file is not a `[[wiki link]]`.** Wiki links resolve by *name*
    //: against notes and documents; an image or an attachment has a url and
    //: no name to resolve, so an item like that carries the markdown it wants
    //: inserted and the opening `[[` the trigger left behind is removed
    //: first. Asked for as "cross-link everything: notes, documents, files,
    //: maps from anywhere" — the picker covered two of the four.
    const at = textarea.selectionStart;
    const open = trigger === "[[" ? at - trigger.length : at;
    editorSplice(textarea, open, at, item.markdown, null);
  } else if (item.value !== undefined) {
    // A link target: close the brackets and step past them.
    const at = textarea.selectionStart;
    editorSplice(textarea, at, at, `${item.value}]]`, null);
  } else if (typeof item.run === "function") {
    item.run(textarea);
  }
}

function editorOpenMenu(textarea, trigger) {
  editorMenuState.open = true;
  editorMenuState.textarea = textarea;
  editorMenuState.trigger = trigger;
  editorMenuState.index = 0;
  editorRefreshMenu();
}

// Recompute what the menu should show for whatever is currently before the
// caret. Called on every keystroke while open.
function editorRefreshMenu() {
  const { textarea, trigger } = editorMenuState;
  if (!textarea || !trigger) return editorCloseMenu();
  const token = editorTokenAt(textarea, trigger);
  if (!token) return editorCloseMenu();

  editorMenuState.start = token.start;
  const context = EDITOR_SURFACES[textarea.id] || "note";
  let items;
  if (trigger === "/") {
    const all = editorCommands(context);
    // With nothing typed, show a curated shortlist so that every group is
    // represented and reachable; once there is a query, search the full set.
    // Found the hard way: a flat cap over an alphabetically-grouped list meant
    // Links, AI and Templates were unreachable without already knowing to type
    // for them, which defeats the point of a discovery menu.
    const pool = token.fragment ? all : all.filter((c) => c.primary);
    items = editorRankCommands(pool, token.fragment);
  } else {
    items = editorLinkMatches(token.fragment);
  }

  // The menu scrolls (max-height in CSS), so the cap only exists to stop a
  // pathological list, not to fit the viewport.
  editorMenuState.items = items.slice(0, 20);
  editorMenuState.index = Math.min(editorMenuState.index, Math.max(0, editorMenuState.items.length - 1));
  editorRenderMenu();
}

// ---------------------------------------------------------------------------
// Wiring — one delegated listener per event, for every surface at once
// ---------------------------------------------------------------------------

document.addEventListener("input", (event) => {
  const textarea = event.target;
  if (!(textarea instanceof HTMLTextAreaElement)) return;
  if (!(textarea.id in EDITOR_SURFACES)) return;

  if (editorMenuState.open && editorMenuState.textarea === textarea) {
    editorRefreshMenu();
    return;
  }
  // Not open yet: does what was just typed start a token?
  //
  // The capture box keeps its own [[ autocomplete (app.js's #wiki-suggest),
  // which predates this file and is wired, styled and tested. Two menus racing
  // for the same trigger in the same box would both open. So "[[" is claimed
  // here only for surfaces that had nothing before — today, the document
  // editor. Migrating capture onto this one mechanism is worth doing, but as
  // its own change, not folded into the diff that introduces the mechanism.
  const claimsWiki = textarea.id !== "entry-content";
  for (const trigger of claimsWiki ? ["/", "[["] : ["/"]) {
    if (editorTokenAt(textarea, trigger)) {
      if (trigger === "[[") {
        // Fetch documents once, then redraw — the list opens on notes alone
        // and gains documents a moment later rather than blocking on a fetch.
        if (editorDocumentCache === null) {
          editorDocumentCache = [];
          apiJson("/documents")
            .then((docs) => {
              editorDocumentCache = Array.isArray(docs) ? docs : [];
              if (editorMenuState.open) editorRefreshMenu();
            })
            .catch(() => {
              editorDocumentCache = [];
            });
        }
        //: Files and images the same way: the menu opens on what is already
        //: in memory and gains the rest a moment later, rather than making
        //: the first keystroke wait on two requests.
        if (editorFileCache === null) {
          editorFileCache = [];
          editorLoadFiles().then(() => {
            if (editorMenuState.open) editorRefreshMenu();
          });
        }
      }
      editorOpenMenu(textarea, trigger);
      return;
    }
  }
});

document.addEventListener(
  "keydown",
  (event) => {
    if (!editorMenuState.open) return;
    if (event.target !== editorMenuState.textarea) return;
    const { items } = editorMenuState;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!items.length) return;
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      editorMenuState.index = (editorMenuState.index + step + items.length) % items.length;
      editorRenderMenu();
      return;
    }
    if (event.key === "Enter" || event.key === "Tab") {
      if (!items.length) return;
      event.preventDefault();
      // stopPropagation as well as preventDefault: the capture box submits on
      // Ctrl+Enter and the document editor has its own Enter handling, and
      // choosing from a menu must not also trigger the surface behind it.
      event.stopPropagation();
      editorRunItem(editorMenuState.index);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      editorCloseMenu();
    }
  },
  true // capture phase, so the menu answers before the surface's own handlers
);

// Clicking anywhere else, or moving the caret with the mouse, dismisses it.
document.addEventListener("mousedown", (event) => {
  if (!editorMenuState.open) return;
  if ($("editor-menu")?.contains(event.target)) return;
  editorCloseMenu();
});

// Scrolling the *page* moves the caret out from under a menu anchored to it,
// so the menu closes. Scrolling *inside the menu itself* must not — reported
// directly: "the popup options for commands aren't scrollable and disappear
// when I try to scroll them". This listener is on the capture phase, so it saw
// the menu's own wheel-scroll before it reached the menu and shut it every
// time, which is exactly the shape of bug that makes a list look un-scrollable
// rather than merely short.
document.addEventListener(
  "scroll",
  (event) => {
    if (!editorMenuState.open) return;
    const menu = $("editor-menu");
    if (menu && (event.target === menu || menu.contains(event.target))) return;
    editorCloseMenu();
  },
  true
);

window.addEventListener("resize", () => editorMenuState.open && editorCloseMenu());

// ---------------------------------------------------------------------------
// The selection toolbar
// ---------------------------------------------------------------------------
//
// Asked for with a link to Obsidian's editing-toolbar plugin: *"pease upgrade
// the way the toolbar works in everything to be like this obsidian toolbar
// plugin. Ive used it and it is great."*
//
// The thing that plugin actually changes is **where the buttons are**, not
// which ones exist — this app's fixed toolbar already has more of them. A bar
// that follows the text you selected puts formatting where you are looking,
// instead of at the top of a panel you may have scrolled a screen away from.
//
// Built on the two pieces that were already here: `editorCaretPoint` (a
// textarea has no Range, so the caret is measured with a mirror element) and
// `applyMarkdown` (documents.js), so this adds a *place*, not a second opinion
// about what `**` means. Nothing here knows any markdown.
const SELECTION_BAR_ACTIONS = [
  { md: "bold", label: "ph:text-b", title: "Bold (Ctrl+B)" },
  { md: "italic", label: "ph:text-italic", title: "Italic (Ctrl+I)" },
  { md: "strike", label: "ph:text-strikethrough", title: "Strikethrough" },
  { md: "highlight", label: "ph:highlighter", title: "Highlight" },
  { md: "code", label: "ph:code", title: "Inline code" },
  { md: "link", label: "ph:link", title: "Link" },
  { md: "h2", label: "ph:text-h", title: "Heading" },
  { md: "quote", label: "ph:quotes", title: "Quote" },
  //: **Not a formatting action, and it says so with a rule beside it.**
  //: REDESIGN.md §R7.1 item 1, quoted from the request: *"able to highlight
  //: text and say something in the chat and the agent gets the context of
  //: what is highlighted and cursor position."* It is the highest ratio of
  //: "feels capable" to work in that whole section, and this bar is already
  //: the thing on screen the moment a selection exists — a second control
  //: somewhere else would be a second thing to find.
  { ask: true, label: "ph:chat-teardrop-text", title: "Ask the AI about this selection" },
];

const selectionBarState = { textarea: null };

function selectionBarElement() {
  let bar = $("selection-bar");
  if (bar) return bar;
  //: Built once, lazily, rather than sitting in index.html: it belongs to this
  //: file's behaviour, and a hidden bar in the markup would be one more thing
  //: for the id/duplicate-listener lints to police for no gain.
  bar = document.createElement("div");
  bar.id = "selection-bar";
  bar.className = "selection-bar hidden";
  bar.setAttribute("role", "toolbar");
  bar.setAttribute("aria-label", "Format the selection");
  for (const action of SELECTION_BAR_ACTIONS) {
    if (action.ask) {
      //: A hairline, so "ask about this" does not read as a ninth way to
      //: change the text. Same separator the chat dock's control strip uses
      //: between its own groups.
      const rule = document.createElement("span");
      rule.className = "selection-bar-rule";
      rule.setAttribute("aria-hidden", "true");
      bar.appendChild(rule);
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ghost small icon-button";
    if (action.md) button.dataset.md = action.md;
    button.title = action.title;
    button.setAttribute("aria-label", action.title);
    setLabel(button, action.label);
    //: `mousedown`, not `click`, and prevented: a click would first move focus
    //: out of the textarea, and the browser drops the selection on the way —
    //: so by the time the handler ran there would be nothing selected to wrap.
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      const textarea = selectionBarState.textarea;
      if (!textarea) return;
      if (action.ask) {
        askAboutSelection(textarea);
        selectionBarHide();
        return;
      }
      applyMarkdown(action.md, textarea.id);
      //: Deliberately *not* hidden here. `applyMarkdown` leaves the text it
      //: wrapped selected, so the bar re-anchors to it on the next
      //: `selectionchange` — which is what lets bold-then-italic be two
      //: presses rather than a re-selection between them. Hiding it made the
      //: bar blink out and straight back in.
    });
    bar.appendChild(button);
  }
  document.body.appendChild(bar);
  return bar;
}

function selectionBarHide() {
  selectionBarState.textarea = null;
  $("selection-bar")?.classList.add("hidden");
}

function selectionBarShow(textarea) {
  const bar = selectionBarElement();
  selectionBarState.textarea = textarea;
  bar.classList.remove("hidden");
  //: Anchored to the *start* of the selection, which is where the eye is when
  //: a selection is made left-to-right, and measured after the bar is visible
  //: so its size is real rather than zero.
  const { top, left, lineHeight } = editorCaretPoint(textarea);
  const size = bar.getBoundingClientRect();
  const margin = 8;
  const boxTop = textarea.getBoundingClientRect().top;
  let y = top - size.height - 6;
  //: **Above the line, unless that means on top of the fixed toolbar.** Every
  //: editing surface in this app has its own formatting row immediately above
  //: the textarea, so a selection on the *first* line put this bar straight
  //: over it — measured, and it read as two toolbars stacked rather than as a
  //: bar belonging to the selection. Below the line in that case: it covers
  //: the next line of the note instead, which is text you can scroll to and
  //: not a control you might press by mistake.
  if (y < Math.max(margin, boxTop)) y = top + (lineHeight || 20) + 6;
  const x = Math.max(margin, Math.min(left, window.innerWidth - size.width - margin));
  bar.style.top = `${Math.round(y)}px`;
  bar.style.left = `${Math.round(x)}px`;
}

//: A `.lp-src` block is one paragraph of the document's live view — the
//: *default* document view, and each paragraph is its own textarea with no id
//: (see `docLiveEditor`). Keyed by class rather than added to
//: `EDITOR_SURFACES` because there is one of them per paragraph, and that map
//: is an id-to-context table by construction.
function isEditorSurface(node) {
  if (!(node instanceof HTMLTextAreaElement)) return false;
  return node.id in EDITOR_SURFACES || node.classList.contains("lp-src");
}

function selectionBarSync() {
  const active = document.activeElement;
  if (!isEditorSurface(active)) {
    return selectionBarHide();
  }
  //: A caret is not a selection. Nothing appears until there is text to act
  //: on, which is what keeps this from being a bar that hovers over the note
  //: while you type.
  if (active.selectionStart === active.selectionEnd) return selectionBarHide();
  selectionBarShow(active);
}

//: `selectionchange` is the one event that fires for *every* way a selection
//: can change — drag, shift+arrow, double-click, select-all, undo — where
//: mouseup/keyup each miss several. It fires on `document`, not the element.
document.addEventListener("selectionchange", selectionBarSync);
//: The bar is positioned in viewport coordinates against a caret that moves
//: when anything scrolls, so it re-anchors rather than drifting away from the
//: text it belongs to. Capture, because the scroller is usually a descendant.
document.addEventListener("scroll", () => selectionBarState.textarea && selectionBarSync(), true);
window.addEventListener("resize", () => selectionBarState.textarea && selectionBarSync());
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && selectionBarState.textarea) selectionBarHide();
});

//: How much text either side of the selection travels with it. Enough that a
//: pronoun in the selection ("why does *it* do that?") has an antecedent, and
//: small enough that a selection made in a 40,000-character document does not
//: quietly become the whole document — the harness budgets tool *results*
//: (§R5 item 4) but the question itself is not a tool result, so nothing else
//: would bound this.
const SELECTION_CONTEXT_MARGIN = 240;

//: Where the selection sits, in a form the model can be told about and the
//: app can re-check later. `line`/`column` are 1-based because that is what
//: every editor in the world shows the user, and the number is going into a
//: chip they read.
function selectionContextFrom(textarea) {
  //: **A live-view block reports itself in the document's coordinates.** Its
  //: own offsets start at zero for every paragraph, so left alone this would
  //: tell the model "line 2" for the last paragraph of a long document — and
  //: `revalidateSelection` would then check those offsets against the wrong
  //: textarea entirely, since the block is replaced whenever it re-renders.
  //: Translating here means everything downstream sees one surface.
  if (textarea.classList.contains("lp-src")) {
    const source = $("doc-content");
    const base = typeof docLiveBlockOffset === "function" ? docLiveBlockOffset(textarea) : null;
    if (source && base !== null) {
      return selectionOffsets(
        source,
        base + textarea.selectionStart,
        base + textarea.selectionEnd
      );
    }
    //: The block could not be located in the document — it is mid-edit, or two
    //: paragraphs are identical and neither the index nor the search settled
    //: it. Still a *document* selection, and saying so matters: falling
    //: through to the line below would label a document "the note you're
    //: writing" and report a line number counted from the top of the
    //: paragraph. The offsets are the block's own, which
    //: `revalidateSelection` will find do not match `doc-content` — so it
    //: reports the position as unknown, which is the truth.
    return { ...selectionOffsets(textarea, textarea.selectionStart, textarea.selectionEnd),
      surfaceId: "doc-content", kind: "document" };
  }
  return selectionOffsets(textarea, textarea.selectionStart, textarea.selectionEnd);
}

function selectionOffsets(textarea, start, end) {
  const value = textarea.value;
  const text = value.slice(start, end);
  const upToCaret = value.slice(0, end);
  const line = upToCaret.split("\n").length;
  const column = end - (upToCaret.lastIndexOf("\n") + 1) + 1;
  return {
    surfaceId: textarea.id,
    kind: EDITOR_SURFACES[textarea.id] || "note",
    start,
    end,
    text,
    line,
    column,
    before: value.slice(Math.max(0, start - SELECTION_CONTEXT_MARGIN), start),
    after: value.slice(end, end + SELECTION_CONTEXT_MARGIN),
  };
}

//: The label on the chip, and the only place that knows which surface belongs
//: to which thing. `entry-content` deliberately has no id: it is a note being
//: written that does not exist yet, and a selection from it is still worth
//: asking about — the text is what matters, not a row in the database.
function selectionContextSource(surfaceId) {
  if (surfaceId === "doc-content") {
    const doc = typeof currentDoc !== "undefined" ? currentDoc : null;
    return { title: doc?.title || "this document", entityKind: "document", entityId: doc?.id ?? null };
  }
  if (surfaceId === "entry-edit-content") {
    const entry =
      typeof allEntries !== "undefined" && typeof editingId !== "undefined"
        ? allEntries.find((e) => e.id === editingId)
        : null;
    return {
      title: entry ? noteLabel(entry, 40) : "this note",
      entityKind: "note",
      entityId: entry?.id ?? null,
    };
  }
  return { title: "the note you're writing", entityKind: "note", entityId: null };
}

function askAboutSelection(textarea) {
  //: The *resolved* surface, not the textarea that was focused: a live-view
  //: block reports itself as `doc-content` (see `selectionContextFrom`), and
  //: looking the label up by the block's own id would call a document "the
  //: note you're writing".
  const where = selectionContextFrom(textarea);
  const context = { ...where, ...selectionContextSource(where.surfaceId) };
  if (!context.text.trim()) return;
  attachSelectionContext(context);
}

// ---------------------------------------------------------------------------
// Create-on-miss: a link to something that does not exist yet
// ---------------------------------------------------------------------------

// confirmDialog's three-way sibling. Built here rather than generalising
// confirmDialog because that function's contract is a boolean, and widening it
// to return a string would mean auditing all of its call sites for a truthy
// check that now passes on "cancel".
//
// The DOM shape, the captured Escape handler, the backdrop click and the
// "focus the safe option, not the committing one" rule are all copied from
// confirmDialog deliberately — a second dialog that behaves differently from
// the app's own is worse than no dialog.
function editorChoiceDialog(message, choices) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay confirm-overlay";
    overlay.setAttribute("role", "dialog");
    // aria-modal, because this one genuinely is: the page behind it is inert
    // until it is answered. (The focus trap keys off exactly this attribute —
    // see HANDOVER.md on the 13 anchored popovers that must NOT carry it.)
    overlay.setAttribute("aria-modal", "true");

    const card = document.createElement("div");
    card.className = "card modal-card confirm-card";
    const text = document.createElement("p");
    text.className = "confirm-text";
    for (const part of String(message).split(/\n{2,}/)) {
      const line = document.createElement("span");
      line.textContent = part;
      text.append(line, document.createElement("br"));
    }
    const row = document.createElement("div");
    row.className = "row confirm-actions";

    let settled = false;
    const close = (answer) => {
      if (settled) return;
      settled = true;
      document.removeEventListener("keydown", onKey, true);
      overlay.remove();
      returnFocus?.focus?.();
      resolve(answer);
    };
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close(null);
      }
    };

    const returnFocus = document.activeElement;
    const cancel = smallButton("Cancel", "Leave the link unresolved", () => close(null));
    row.appendChild(cancel);
    for (const choice of choices) {
      row.appendChild(
        smallButton(choice.label, choice.title || choice.label, () => close(choice.value), false)
      );
    }
    card.append(text, row);
    overlay.appendChild(card);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close(null);
    });
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(overlay);
    // Cancel takes focus: a stray Enter must not be the thing that creates a
    // note, the same reasoning confirmDialog uses for its destructive button.
    cancel.focus();
  });
}

// Clicking a [[link]] whose target does not exist yet.
//
// A link you typed on purpose is the clearest possible statement that the
// thing ought to exist, so the dead end becomes an offer. Creation stays
// user-confirmed and never happens in the background: silently materialising
// notes from typos is precisely the failure mode this app's autonomous agent
// is deliberately conservative about, and a notebook that grows notes you did
// not ask for is worse than one that makes you click twice.
async function offerToCreateWikiTarget(name) {
  const wanted = String(name || "").trim();
  if (!wanted) return;

  const choice = await editorChoiceDialog(
    `Nothing called “${wanted}” exists yet.\n\nCreate it, and this link will resolve to it.`,
    [
      { value: "note", label: "Create note", title: `Start a note beginning "${wanted}"` },
      { value: "document", label: "Create document", title: `Start a document titled "${wanted}"` },
    ]
  );
  if (!choice) return;

  try {
    if (choice === "note") {
      // The note's content opens with the link text, because that is what
      // resolution matches on — a note created here that did not start with
      // the name would leave the very link that made it still unresolved.
      const entry = await apiJson("/entries", {
        method: "POST",
        body: JSON.stringify({ content: `${wanted}\n\n` }),
      });
      await loadEntries();
      toast(`Created “${wanted}”.`);
      if (entry?.id) flashEntry(entry.id);
      return;
    }

    const doc = await apiJson("/documents", {
      method: "POST",
      body: JSON.stringify({ title: wanted, content: `# ${wanted}\n\n` }),
    });
    // Keep the resolver's cache honest, or the link stays unresolved until
    // something else happens to refetch documents.
    if (doc) {
      editorDocumentCache = [...(editorDocumentCache || []), doc];
      toast(`Created “${wanted}”.`);
      openDocument(doc.id);
    }
  } catch (error) {
    toast(error.message || "Could not create that.", true);
  }
}

// ---------------------------------------------------------------------------
// Syntax highlighting for the file viewer (REDESIGN.md §R7.1 item 3)
// ---------------------------------------------------------------------------
//
// **Written here rather than pulled in.** This app is offline by construction
// — there is no CDN to load highlight.js from and no bundler to vendor it
// with, and a 900 KB library shipped for one panel would be the largest
// single asset in the project. Four token classes cover what makes code
// readable at a glance: comments recede, strings and numbers stand out from
// identifiers, keywords carry the structure. That is most of the value of a
// full grammar for none of the weight.
//
// **The colours are existing semantic tokens, not new ones.** `--muted` for
// comments, `--ok` for strings, `--warn` for numbers, `--accent` for
// keywords — each already has a light and a dark value, so this follows the
// theme for free and adds nothing for `tests/test_style_scale.py` to police.
//
// **Every pattern here is linear.** CI runs CodeQL, which has caught a real
// polynomial-ReDoS in this repo before; the string rules use the
// `[^"\\\n]|\\.` shape whose alternatives are disjoint on their first
// character, and nothing nests a quantifier inside a quantifier.

//: What a suffix is written in. The value is the profile name below; a suffix
//: that is missing gets `generic`, which still finds strings, numbers and
//: both comment styles — worth having for a `.conf` nobody thought about.
const CODE_LANGUAGES = {
  js: "c", mjs: "c", cjs: "c", ts: "c", tsx: "c", jsx: "c", java: "c",
  c: "c", h: "c", cpp: "c", hpp: "c", cs: "c", go: "c", rs: "c", swift: "c",
  kt: "c", php: "c", scss: "c", css: "css",
  py: "hash", rb: "hash", sh: "hash", bash: "hash", zsh: "hash",
  yaml: "hash", yml: "hash", toml: "hash", ini: "hash", cfg: "hash", r: "hash",
  sql: "sql", json: "json", html: "markup", htm: "markup", xml: "markup",
};

//: Keywords worth colouring, per family. Deliberately not exhaustive: a
//: keyword list that tries to be complete is a maintenance burden that buys
//: nothing — what the eye uses is the *shape* of the control flow, and these
//: are the words that carry it.
const CODE_KEYWORDS = {
  c: "abstract async await break case catch class const continue default delete do else enum export extends false final finally for from function goto if implements import in instanceof interface let new null package private protected public return static struct super switch this throw throws true try typeof var void while yield",
  hash: "and as assert async await break case class continue def del elif else end except false finally for from global if import in is lambda module nil none not or pass raise return self true try unless until while with yield",
  sql: "add all alter and as asc between by case create delete desc distinct drop else exists from group having in inner insert into is join left limit not null on or order outer right select set table then union update values where",
  json: "true false null",
  css: "important media import supports keyframes from to and not only",
  markup: "",
  generic: "false null true",
};

//: One scanner, built once per family. Order inside the alternation *is* the
//: precedence: comments and strings first, so a `#` inside a string or the
//: word `if` inside a comment is not re-coloured as something else.
const codeScanners = new Map();

function codeScanner(family) {
  if (codeScanners.has(family)) return codeScanners.get(family);
  const lineComment =
    family === "hash" ? "#[^\\n]*" : family === "sql" ? "--[^\\n]*" : "\\/\\/[^\\n]*";
  const parts = [];
  if (family === "markup") parts.push("(?<comment><!--[\\s\\S]*?-->)");
  else parts.push(`(?<comment>\\/\\*[\\s\\S]*?\\*\\/|${lineComment})`);
  parts.push('(?<string>"(?:[^"\\\\\\n]|\\\\.)*"|\'(?:[^\'\\\\\\n]|\\\\.)*\'|`(?:[^`\\\\]|\\\\.)*`)');
  parts.push("(?<number>\\b\\d[\\d_]*(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b)");
  const words = (CODE_KEYWORDS[family] || CODE_KEYWORDS.generic).trim().split(/\s+/);
  if (words.length && words[0]) parts.push(`(?<keyword>\\b(?:${words.join("|")})\\b)`);
  const scanner = new RegExp(parts.join("|"), "g");
  codeScanners.set(family, scanner);
  return scanner;
}

//: Which family a filename is in. Extension only — content sniffing guesses
//: wrong on short files and there is nothing to gain: a file this app can
//: view arrived with a suffix it recognised (`docview.CODE_SUFFIXES`).
function codeFamilyFor(filename) {
  const suffix = /\.([a-z0-9]+)$/i.exec(String(filename || ""));
  return CODE_LANGUAGES[(suffix?.[1] || "").toLowerCase()] || "generic";
}

//: Fills `target` with the highlighted source. Text nodes and `<span>`s
//: built with `textContent`, never `innerHTML` — a file's own text is exactly
//: the untrusted input a markup-assembling highlighter turns into an
//: injection, and this app's CSP would not save a same-origin one.
function highlightCodeInto(target, text, filename) {
  const scanner = codeScanner(codeFamilyFor(filename));
  scanner.lastIndex = 0;
  const source = String(text ?? "");
  let at = 0;
  let match;
  while ((match = scanner.exec(source)) !== null) {
    //: A zero-length match would loop forever. None of the patterns above can
    //: produce one, and this costs nothing to be certain of.
    if (match.index === scanner.lastIndex) {
      scanner.lastIndex++;
      continue;
    }
    if (match.index > at) target.appendChild(document.createTextNode(source.slice(at, match.index)));
    const kind = Object.keys(match.groups).find((name) => match.groups[name] !== undefined);
    const span = document.createElement("span");
    span.className = `tok-${kind}`;
    span.textContent = match[0];
    target.appendChild(span);
    at = match.index + match[0].length;
  }
  if (at < source.length) target.appendChild(document.createTextNode(source.slice(at)));
}
