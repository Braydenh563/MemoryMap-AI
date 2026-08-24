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

// A callout block, ready to type into.
//
// Every line of the body needs its own "> " — a blockquote ends at the first
// line that does not start with one, so a two-line callout written without the
// prefix on line two silently becomes a one-line callout followed by a
// paragraph. Getting that wrong is invisible until it renders.
function calloutTemplate(kind) {
  const meta = CALLOUT_KINDS[kind] || CALLOUT_KINDS.note;
  return {
    block: `\n> [!${kind}] ${meta.label}\n> `,
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
      label: `${meta.icon} ${meta.label} box`,
      hint: `> [!${kind}]`,
      keywords: ["callout", "box", "frame", "admonition", kind, meta.label],
      run: (textarea) => editorApplyAction(textarea, calloutTemplate(kind)),
    });
  }

  commands.push(
    {
      id: "table",
      group: "Blocks & frames",
      label: "\u{1F4CA} Table",
      hint: "3 columns",
      keywords: ["table", "grid", "columns"],
      run: (textarea) => editorApplyAction(textarea, MD_ACTIONS.table),
    },
    {
      id: "codeblock",
      group: "Blocks & frames",
      label: "\u{1F4BB} Code block",
      hint: "```",
      keywords: ["code", "fence", "snippet"],
      run: (textarea) => editorApplyAction(textarea, MD_ACTIONS.codeblock),
    },
    {
      id: "checklist",
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
      group: "Blocks & frames",
      label: "\u{2014} Divider",
      hint: "---",
      keywords: ["divider", "rule", "hr", "separator", "break"],
      run: (textarea) => editorApplyAction(textarea, MD_ACTIONS.hr),
    },
    {
      id: "heading",
      group: "Blocks & frames",
      label: "\u{1F516} Section heading",
      hint: "## — becomes a jump target",
      keywords: ["heading", "section", "anchor", "title", "h2"],
      run: (textarea) => editorApplyAction(textarea, MD_ACTIONS.h2),
    }
  );

  // --- links & references ---
  commands.push(
    {
      id: "wikilink",
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
      id: "weblink",
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
        group: "AI",
        label: "\u{2728} AI edit this selection",
        hint: "rewrite, expand, tighten",
        keywords: ["ai", "rewrite", "improve", "expand", "edit"],
        run: () => $("doc-ai")?.click(),
      },
      {
        id: "ai-extract",
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

  return [...notes, ...documents];
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

  if (item.value !== undefined) {
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
  const items =
    trigger === "/"
      ? editorRankCommands(editorCommands(context), token.fragment)
      : editorLinkMatches(token.fragment);

  editorMenuState.items = items.slice(0, 12);
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

document.addEventListener("scroll", () => editorMenuState.open && editorCloseMenu(), true);

window.addEventListener("resize", () => editorMenuState.open && editorCloseMenu());

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
