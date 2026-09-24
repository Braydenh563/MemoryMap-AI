// documents-prose.js: the prose tools (split out of documents.js on
// 2026-09-24).
//
// What is here: the PROSE-TOOLS region as it stood in documents.js, whole
// and verbatim: grammar (Harper, in the documents editor and in the note
// boxes), suggestion mode (DOC-SUGGEST), the accessibility check and read
// aloud, plus `docProseToolExtensions`, the one hook `docCmExtensions` calls
// for all of them. The rules they sit beside (the prose check, the status
// bar, the dictionary, the finding shapes) stayed in documents.js: they are
// shared with the code side and the note surfaces.
//
// **Loaded in the Library bundle, before documents.js**, for the same reason
// documents-code.js is (see its header): this file's top level reads nothing
// from documents.js, and documents.js's top-level wiring names functions
// defined here, so listing this file first means they exist before any of
// that wiring can run.

// PROSE-TOOLS-BEGIN
// =============================================================================
// Prose tools: grammar, accessibility (INBOX 401 and 404, prose side)
// =============================================================================
//
// The rules above read the shape of the text. What they cannot do, by their
// own header's admission, is grammar: its/it's, agreement, "a apple". Harper
// (Automattic, Apache-2.0, vendored in `frontend/vendor/harper/`) can, on this
// machine, in a worker (`harper-worker.js`), with no model and no network.
//
// **Measured before it was wired** (`scratchpad/ui-sweeps/p2-harper.js`):
// nothing of it is fetched at boot, so the boot budget (WORLD_CLASS_PLAN H7)
// does not move and it is not an install-it-yourself extra; the first check
// costs 1.75 s cold (fetch plus compile of the 15.9 MB binary, off the main
// thread) and every check after that about 100 ms for 1,400 words, in the
// worker. So it loads on the first prose document or note box that asks, and
// the editor never waits for it: until it answers, the rule findings stand on
// their own, exactly as they did before it existed.
//
// **Spelling stays with the dictionary.** Harper has its own spelling lints,
// and they are dropped: this app's dictionary is the one the reader can add
// to, and two checkers disagreeing about one word is the fastest way to teach
// a writer to ignore both.

const DOC_GRAMMAR_WORKER_URL = "/harper-worker.js";
//: Harper's lint kinds this app does not take (see above).
const DOC_GRAMMAR_SKIP_KINDS = new Set(["Spelling"]);
//: The quiet between keystrokes before a note box is checked. Longer than
//: the document's own pass because each ask costs the worker a whole lint.
const DOC_GRAMMAR_NOTE_DEBOUNCE_MS = 600;

let docGrammarWorker = null;
let docGrammarError = "";
let docGrammarSeq = 0;
const docGrammarWaiting = new Map();
//: The document's last answer: the text it was for and its findings.
let docGrammarCache = { text: null, findings: [] };
let docGrammarAsking = null;

//: On unless the reader turned it off, and never once it has failed: a
//: binary that did not load will not load on the next keystroke either.
function docGrammarEnabled() {
  if (docGrammarError) return false;
  if (typeof Worker !== "function") return false;
  return !(typeof prefsCache === "object" && prefsCache && prefsCache.grammar_check === false);
}

function docGrammarFail(reason) {
  docGrammarError = reason || "the grammar checker did not load";
  console.warn("Grammar check off for this session:", docGrammarError);
  for (const resolve of docGrammarWaiting.values()) resolve(null);
  docGrammarWaiting.clear();
  if (docGrammarWorker) docGrammarWorker.terminate();
  docGrammarWorker = null;
}

//: One lint of `text`, or null when there is no checker. Never rejects: a
//: caller that has to catch is a caller that one day will not.
function docGrammarAsk(text) {
  if (!docGrammarEnabled()) return Promise.resolve(null);
  if (!docGrammarWorker) {
    try {
      //: Stamped like every other local script, so a new release never
      //: runs last release's worker; the vendored files it imports are not,
      //: by the cache-busting rule for `vendor/`.
      const stamp = typeof lazyAssetStamp === "function" ? lazyAssetStamp() : "";
      docGrammarWorker = new Worker(`${DOC_GRAMMAR_WORKER_URL}${stamp}`, { type: "module" });
    } catch (error) {
      docGrammarFail(String(error && error.message ? error.message : error));
      return Promise.resolve(null);
    }
    docGrammarWorker.addEventListener("message", (event) => {
      const data = event.data || {};
      const resolve = docGrammarWaiting.get(data.id);
      if (!data.ok) return docGrammarFail(data.error);
      if (!resolve) return;
      docGrammarWaiting.delete(data.id);
      resolve(data.lints || []);
    });
    //: A worker whose script fails to load says so here and nowhere else.
    docGrammarWorker.addEventListener("error", (event) => {
      event.preventDefault?.();
      docGrammarFail(event.message || "the grammar worker did not start");
    });
  }
  const id = ++docGrammarSeq;
  return new Promise((resolve) => {
    docGrammarWaiting.set(id, resolve);
    docGrammarWorker.postMessage({ id, text, dialect: docSpellingVariant() });
  });
}

//: Harper writes code in backticks and, now and then, a dash this app's copy
//: rule does not allow. Said in the app's own voice instead. The dash is
//: built from its code point so the no-dash lint still reads this file clean.
const DOC_GRAMMAR_DASH = new RegExp(`\\s*${String.fromCharCode(0x2014)}\\s*`, "g");

function docGrammarMessage(message) {
  return String(message || "")
    .replace(/`([^`]+)`/g, "“$1”")
    .replace(DOC_GRAMMAR_DASH, ": ")
    .trim();
}

//: Harper's lints as this app's findings. `replacement` stays null on
//: purpose: "Fix all" applies without asking, and a grammar suggestion is a
//: judgement, so it is always offered and never applied in bulk.
function docGrammarFindings(lints, text) {
  const out = [];
  for (const lint of lints || []) {
    if (DOC_GRAMMAR_SKIP_KINDS.has(lint.kind)) continue;
    if (!(lint.end > lint.start) || lint.end > text.length) continue;
    const span = text.slice(lint.start, lint.end);
    const alternatives = [];
    for (const suggestion of lint.suggestions || []) {
      const option = suggestion.kind === "InsertAfter" ? span + suggestion.text : suggestion.text;
      if (option !== span && !alternatives.includes(option)) alternatives.push(option);
    }
    out.push({
      rule: "grammar",
      source: "harper",
      harperKind: lint.kind,
      message: docGrammarMessage(lint.message),
      start: lint.start,
      end: lint.end,
      text: span,
      replacement: null,
      alternatives,
    });
  }
  return out;
}

//: **Last answer, moved with the edits since.** A check is ~100 ms behind the
//: text, so between a keystroke and its answer the old findings are carried
//: across rather than dropped: everything before the first changed character
//: keeps its offset, everything after the last one moves by the length
//: difference, and anything the edit touched is let go. Without this every
//: grammar underline would blink out on each keystroke and back a beat later.
function docProseRemap(findings, from, to) {
  if (from === to) return findings;
  let head = 0;
  const limit = Math.min(from.length, to.length);
  while (head < limit && from.charCodeAt(head) === to.charCodeAt(head)) head += 1;
  let tail = 0;
  while (
    tail < limit - head &&
    from.charCodeAt(from.length - 1 - tail) === to.charCodeAt(to.length - 1 - tail)
  ) {
    tail += 1;
  }
  const shift = to.length - from.length;
  const cut = from.length - tail;
  const out = [];
  for (const finding of findings) {
    if (finding.end <= head) out.push(finding);
    else if (finding.start >= cut) out.push({ ...finding, start: finding.start + shift, end: finding.end + shift });
  }
  return out;
}

//: Ask for the document's text unless it is already asked for or answered.
//: One ask in flight: the answer to a stale ask repaints and the repaint asks
//: again, so a burst of typing costs one lint per pause, not one per key.
function docGrammarRequest(text) {
  if (!docGrammarEnabled() || docGrammarAsking !== null || docGrammarCache.text === text) return;
  docGrammarAsking = text;
  docGrammarAsk(text).then((lints) => {
    docGrammarAsking = null;
    if (lints === null) return renderDocProse();
    docGrammarCache = { text, findings: docGrammarFindings(lints, text) };
    renderDocProse();
  });
}

//: The findings the prose tools add, merged into the rules' own list. A span
//: a rule already holds keeps the rule's finding: the rule is the one with a
//: dictionary and an "always correct" behind it.
function docProseExtras(text, found) {
  const extra = [];
  if (docGrammarEnabled()) {
    docGrammarRequest(text);
    if (docGrammarCache.text !== null) {
      extra.push(...docProseRemap(docGrammarCache.findings, docGrammarCache.text, text));
    }
  }
  //: Accessibility is about the document's structure rather than its words,
  //: so it neither yields to a rule's finding on the same span nor is
  //: skipped where a link's address or a tag starts: that is where it looks.
  const access = docAccessFindings(text).filter((finding) => !docProseIgnored.has(docProseKey(finding)));
  if (!extra.length && !access.length) return found;
  const skip = docProseSkipMask(text);
  const taken = found.filter((finding) => !DOC_FINDING_SKIP.has(finding.rule));
  const merged = found.concat(access);
  for (const finding of extra) {
    if (skip[finding.start] === 1) continue;
    if (text.slice(finding.start, finding.end) !== finding.text) continue;
    if (docProseIgnored.has(docProseKey(finding))) continue;
    if (taken.some((rule) => rule.start < finding.end && finding.start < rule.end)) continue;
    merged.push(finding);
  }
  return merged.sort((a, b) => a.start - b.start);
}

// --- grammar in the note boxes ------------------------------------------------
//
// The note editors have no findings plugin (see `noteSurfaceExtensions`): the
// document's list is at the document's offsets. This is the note's own, one
// list per view, checked by the same worker and drawn in the same underline.
// A press on one opens its answers at the pointer through `openMenuAtPoint`.

let noteGrammarEffect = null;

function noteGrammarPlugin(CM) {
  const { Decoration, ViewPlugin } = CM.view;
  if (!noteGrammarEffect) noteGrammarEffect = CM.state.StateEffect.define();
  const effect = noteGrammarEffect;

  function build(view, findings) {
    const text = view.state.doc.toString();
    const ranges = [];
    findings.forEach((finding, index) => {
      if (text.slice(finding.start, finding.end) !== finding.text) return;
      ranges.push(
        Decoration.mark({
          class: "cm-finding cm-finding-grammar",
          attributes: { "data-note-grammar": String(index), title: finding.message },
        }).range(finding.start, finding.end)
      );
    });
    return Decoration.set(ranges, true);
  }

  return ViewPlugin.fromClass(
    class {
      constructor(view) {
        this.view = view;
        this.findings = [];
        this.checked = null;
        this.timer = 0;
        this.decorations = Decoration.none;
        this.schedule();
      }
      schedule() {
        clearTimeout(this.timer);
        if (!docGrammarEnabled()) return;
        this.timer = setTimeout(() => this.check(), DOC_GRAMMAR_NOTE_DEBOUNCE_MS);
      }
      check() {
        const text = this.view.state.doc.toString();
        if (!text.trim() || text === this.checked) return;
        docGrammarAsk(text).then((lints) => {
          if (lints === null || this.destroyed) return;
          if (this.view.state.doc.toString() !== text) return this.schedule();
          const skip = docProseSkipMask(text);
          this.checked = text;
          this.findings = docGrammarFindings(lints, text).filter((finding) => skip[finding.start] !== 1);
          this.view.dispatch({ effects: effect.of(null) });
        });
      }
      update(update) {
        if (update.docChanged) {
          const before = update.startState.doc.toString();
          this.findings = docProseRemap(this.findings, before, update.state.doc.toString());
          this.schedule();
        }
        const told = update.transactions.some((tr) => tr.effects.some((e) => e.is(effect)));
        if (update.docChanged || told) this.decorations = build(update.view, this.findings);
      }
      destroy() {
        this.destroyed = true;
        clearTimeout(this.timer);
      }
    },
    {
      decorations: (plugin) => plugin.decorations,
      eventHandlers: {
        mousedown(event, view) {
          const mark = event.target instanceof Element && event.target.closest("[data-note-grammar]");
          if (!mark || event.button !== 0) return false;
          const finding = this.findings[Number(mark.getAttribute("data-note-grammar"))];
          if (!finding) return false;
          event.preventDefault();
          noteGrammarMenu(view, this, finding, event.clientX, event.clientY);
          return true;
        },
      },
    }
  );
}

//: The answers to one grammar finding in a note: each suggestion as a row,
//: then "Ignore". Recomputed against the text as it is at the press, for the
//: reason `docProseFix` gives.
function noteGrammarMenu(view, plugin, finding, x, y) {
  if (typeof openMenuAtPoint !== "function") return;
  const apply = (option) => {
    const text = view.state.doc.toString();
    if (text.slice(finding.start, finding.end) !== finding.text) {
      return toast("That text has changed since it was checked.", true);
    }
    view.dispatch({ changes: { from: finding.start, to: finding.end, insert: option } });
    view.focus();
  };
  const items = finding.alternatives.slice(0, DOC_SUGGEST_MAX).map((option) => ({
    group: "fix",
    label: option === "" ? `ph:eraser Remove “${finding.text}”` : option,
    title: finding.message,
    run: () => apply(option),
  }));
  if (!items.length) {
    items.push({ group: "fix", label: `ph:info ${finding.message}`, disabled: true, run: () => {} });
  }
  items.push({
    group: "ignore",
    label: "ph:eye-slash Ignore this one",
    run: () => {
      plugin.findings = plugin.findings.filter((other) => other !== finding);
      view.dispatch({ effects: noteGrammarEffect.of(null) });
    },
  });
  openMenuAtPoint(items, finding.message, x, y);
}

// --- suggestion mode (tracked changes, INBOX 404) ------------------------------
//
// **Stored in the text, as CriticMarkup.** `{++inserted++}` and
// `{--deleted--}` are a published plain-text convention (MultiMarkdown,
// Obsidian and iA Writer read it), and the document's comments already live
// in the text the same way (`%%remark%%`, DOC-COMMENT). So a suggestion is
// saved, versioned, diffed, synced and exported with the document by every
// path that already carries its text, with no field and no migration, and a
// .md download still says what was suggested to anything that reads it. The
// alternative, offsets in a side table, has to be moved through every edit
// by every writer (autosave, restore, the AI, a formatting button), and the
// first writer that forgets moves every mark onto the wrong words.
//
// What is tracked: typing, deleting, pasting and dropping while the mode is
// on. What is not: edits a command makes (a formatting button, a fix from
// the word menu, the AI), which say so by not carrying a user event.
//
// The model between the two markers is pure string work, so
// `tests/test_prose_tools.py` runs it in node.

// DOC-SUGGEST-BEGIN
//: Fenced and inline code: a `{++` in a code sample is the sample.
function docSuggestCodeMask(text) {
  const mask = new Uint8Array(text.length);
  const patterns = [/(^|\n)[ \t]*(```|~~~)[^\n]*\n[\s\S]*?(\n[ \t]*\2[^\n]*|$)/g, /`[^`\n]+`/g];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (!match[0].length) {
        pattern.lastIndex += 1;
        continue;
      }
      mask.fill(1, match.index, match.index + match[0].length);
    }
  }
  return mask;
}

//: Every suggestion in the text, in order: its kind, its whole span, and the
//: span of what it suggests (between the three-character markers).
function docSuggestParse(text) {
  const src = String(text == null ? "" : text);
  const code = docSuggestCodeMask(src);
  const pattern = /\{\+\+([\s\S]*?)\+\+\}|\{--([\s\S]*?)--\}/g;
  const out = [];
  let match;
  while ((match = pattern.exec(src)) !== null) {
    if (code[match.index] === 1) continue;
    const ins = match[1] !== undefined;
    const start = match.index;
    const end = start + match[0].length;
    out.push({ kind: ins ? "ins" : "del", start, end, bodyStart: start + 3, bodyEnd: end - 3, body: ins ? match[1] : match[2] });
  }
  return out;
}

//: Two marks of one kind that touch become one, and an empty mark goes, but
//: only in `[lo, hi]`, around the edit that made them: a `--}{--` elsewhere
//: is somebody's text. Returns the text and a function that moves an offset
//: across what was taken out.
function docSuggestNormalize(text, lo, hi) {
  const pattern = /\{\+\+\+\+\}|\{----\}|--\}\{--|\+\+\}\{\+\+/g;
  const cuts = [];
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const end = match.index + match[0].length;
    if (end >= lo && match.index <= hi) cuts.push([match.index, end]);
  }
  let out = "";
  let at = 0;
  for (const [from, to] of cuts) {
    out += text.slice(at, from);
    at = to;
  }
  out += text.slice(at);
  const move = (pos) => {
    let shift = 0;
    for (const [from, to] of cuts) {
      if (pos >= to) shift += to - from;
      else if (pos > from) return from - shift;
    }
    return pos - shift;
  };
  return { text: out, move };
}

//: **One edit, made as a suggestion.** Replacing `[from, to)` of `text` with
//: `insert`; `backward` is a Backspace, which decides where the caret lands.
//:
//: - Deleting words that were themselves suggested as an insertion deletes
//:   them for real: withdrawing your own suggestion is not a new one.
//: - Deleting anything else wraps it in `{--…--}`, merged with a deletion it
//:   touches, so a run of Backspaces is one suggestion.
//: - A marker is never split; an edit that lands only on markers or on text
//:   already suggested for deletion steps over it to the next real letter.
//: - Typing inside an insertion extends it; anywhere else it opens one.
function docSuggestEdit(text, from, to, insert, backward, depth = 0) {
  const src = String(text);
  const marks = docSuggestParse(src);
  const markAt = (i) => marks.find((mark) => mark.start <= i && i < mark.end);
  let region = "";
  let run = "";
  let changed = false;
  const flush = () => {
    if (run) region += `{--${run}--}`;
    run = "";
  };
  for (let i = from; i < to; i += 1) {
    const mark = markAt(i);
    if (mark && mark.kind === "ins" && i >= mark.bodyStart && i < mark.bodyEnd) {
      flush();
      changed = true;
    } else if (mark) {
      flush();
      region += src[i];
    } else {
      run += src[i];
      changed = true;
    }
  }
  flush();
  //: Nothing deletable in the range: a Backspace just after a marker or over
  //: a struck word. Step over the kept characters to the next real one.
  if (to > from && !changed && !insert && depth === 0) {
    let q = backward ? from : to;
    const kept = (i) => {
      const mark = markAt(i);
      return mark && !(mark.kind === "ins" && i >= mark.bodyStart && i < mark.bodyEnd);
    };
    if (backward) {
      while (q > 0 && kept(q - 1)) q -= 1;
      if (q > 0) return docSuggestEdit(src, q - 1, q, "", true, 1);
    } else {
      while (q < src.length && kept(q)) q += 1;
      if (q < src.length) return docSuggestEdit(src, q, q + 1, "", false, 1);
    }
    return { text: src, caret: backward ? from : to };
  }
  let out = src.slice(0, from) + region + src.slice(to);
  let caret = backward ? from : from + region.length;
  let hi = from + region.length;
  if (insert) {
    //: Where the typing goes, in the text after the deletion.
    const after = docSuggestParse(out);
    let p = from + region.length;
    for (const mark of after) {
      if (mark.kind === "del" && p > mark.start && p < mark.end) p = mark.end;
    }
    const host = after.find((mark) => mark.kind === "ins" && p > mark.start && p < mark.end);
    if (host) {
      p = Math.min(Math.max(p, host.bodyStart), host.bodyEnd);
      out = out.slice(0, p) + insert + out.slice(p);
      caret = p + insert.length;
    } else {
      out = `${out.slice(0, p)}{++${insert}++}${out.slice(p)}`;
      caret = p + 3 + insert.length;
    }
    hi = Math.max(hi, caret + 3);
  }
  const tidy = docSuggestNormalize(out, Math.max(0, from - 3), hi + 3);
  caret = tidy.move(caret);
  //: A Backspace leaves the caret in front of the deletion it made, so the
  //: next one reaches the letter before it; a forward delete, behind it.
  for (const mark of docSuggestParse(tidy.text)) {
    if (mark.kind !== "del" || insert) continue;
    if (backward && caret > mark.start && caret <= mark.end) caret = mark.start;
    if (!backward && caret >= mark.start && caret < mark.end) caret = mark.end;
  }
  return { text: tidy.text, caret };
}

//: Accepting or rejecting one suggestion, as an edit over its whole span.
function docSuggestResolve(mark, accept) {
  const keep = (mark.kind === "ins") === accept;
  return { from: mark.start, to: mark.end, insert: keep ? mark.body : "" };
}

//: Every suggestion accepted, or every one rejected: the text as it would be.
function docSuggestResolveAll(text, accept) {
  let out = String(text == null ? "" : text);
  const marks = docSuggestParse(out);
  for (let i = marks.length - 1; i >= 0; i -= 1) {
    const edit = docSuggestResolve(marks[i], accept);
    out = out.slice(0, edit.from) + edit.insert + out.slice(edit.to);
  }
  return out;
}

//: For Read view: struck through and highlighted, in the markdown the
//: renderer already draws, so the page shows what is proposed.
function docSuggestForRead(text) {
  const src = String(text == null ? "" : text);
  const marks = docSuggestParse(src);
  let out = src;
  for (let i = marks.length - 1; i >= 0; i -= 1) {
    const mark = marks[i];
    const body = mark.body.trim() ? (mark.kind === "ins" ? `==${mark.body}==` : `~~${mark.body}~~`) : mark.body;
    out = out.slice(0, mark.start) + body + out.slice(mark.end);
  }
  return out;
}
// DOC-SUGGEST-END

// --- the accessibility check (INBOX 404) ----------------------------------------
//
// Three things a screen reader user meets in a document and a sighted writer
// never sees: a heading level skipped (the outline a screen reader navigates
// by has a hole in it), an image with no description (it is read as its file
// name), and a link whose text means nothing out of context ("click here",
// read in a list of links). Each is a finding in the suggestions panel under
// Accessibility, with the same underline, menu and "Ignore" as the rest.

// DOC-A11Y-BEGIN
//: Link texts that say nothing on their own. Compared lowercased, with the
//: sentence's closing punctuation off.
const DOC_VAGUE_LINKS = new Set([
  "click here", "click", "here", "this", "this link", "link", "read more",
  "more", "learn more", "see here", "go", "this page", "page", "details",
]);

const DOC_ACCESS_RULES = new Set(["heading-order", "image-alt", "link-text"]);

function docAccessFindings(text) {
  const src = String(text == null ? "" : text);
  const code = docSuggestCodeMask(src);
  const out = [];
  //: Headings, by line: outside fences and the frontmatter block.
  let fence = false;
  let front = src.startsWith("---\n");
  let last = 0;
  let at = 0;
  src.split("\n").forEach((line, index) => {
    const start = at;
    at += line.length + 1;
    if (front) {
      if (index > 0 && /^---\s*$/.test(line)) front = false;
      return;
    }
    if (/^\s*(```|~~~)/.test(line)) {
      fence = !fence;
      return;
    }
    const heading = !fence && /^(#{1,6})\s+\S/.exec(line);
    if (!heading) return;
    const level = heading[1].length;
    if (last && level > last + 1) {
      out.push({
        rule: "heading-order",
        message: `A level ${level} heading under a level ${last}: level ${last + 1} is skipped, which leaves a hole in the outline a screen reader moves by`,
        start,
        end: start + line.length,
        text: line,
        replacement: null,
        alternatives: [`${"#".repeat(last + 1)}${line.slice(level)}`],
      });
    }
    last = level;
  });
  const push = (rule, match, message) => {
    if (code[match.index] === 1) return;
    out.push({ rule, message, start: match.index, end: match.index + match[0].length, text: match[0], replacement: null });
  };
  let match;
  //: Links and images in one pass: `!` in front makes it an image.
  const links = /(!?)\[([^\]\n]*)\]\(([^)\s]+)[^)\n]*\)/g;
  while ((match = links.exec(src)) !== null) {
    const words = match[2].trim();
    if (match[1] === "!") {
      if (!words) push("image-alt", match, "An image with no description: a screen reader says only its file name. Write what it shows between the brackets");
      continue;
    }
    const plain = words.toLowerCase().replace(/[.!?:,;]+$/, "");
    if (!plain) push("link-text", match, "A link with no text: a screen reader has nothing to say for it");
    else if (DOC_VAGUE_LINKS.has(plain)) push("link-text", match, `“${words}” says nothing on its own, and a screen reader lists links out of context: name where it goes`);
    else if (/^(https?:\/\/|www\.)\S+$/i.test(words)) push("link-text", match, "A web address as the link's text is read out a character at a time: name the page instead");
  }
  const images = /<img\b[^>]*>/gi;
  while ((match = images.exec(src)) !== null) {
    if (!/\balt\s*=\s*("[^"]*\S[^"]*"|'[^']*\S[^']*')/i.test(match[0])) {
      push("image-alt", match, "An image with no alt text: a screen reader says only its file name");
    }
  }
  return out.sort((a, b) => a.start - b.start);
}
// DOC-A11Y-END

//: Per document and per viewer, like the reading width: whether *this*
//: reader is suggesting in *this* document is not a fact about the text.
const DOC_SUGGEST_KEY = "docSuggestMode";

function docSuggestModes() {
  try {
    return JSON.parse(localStorage.getItem(DOC_SUGGEST_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function docSuggestActive() {
  if (!currentDoc || !currentDoc.id || !docFileType().previewable) return false;
  return docSuggestModes()[currentDoc.id] === true;
}

function setDocSuggestMode(on) {
  if (!currentDoc || !currentDoc.id) return toast("Save the document first.", true);
  const modes = docSuggestModes();
  if (on) modes[currentDoc.id] = true;
  else delete modes[currentDoc.id];
  try {
    localStorage.setItem(DOC_SUGGEST_KEY, JSON.stringify(modes));
  } catch {
    /* the mode still holds for this session through the checkbox */
  }
  renderDocSuggestState();
}

let docSuggestAnnotation = null;
let docSuggestEffect = null;

//: The filter that turns a user's edit into a suggestion, and the plugin that
//: draws suggestions and keeps their markers whole.
function docSuggestExtensions(CM) {
  const { Decoration, ViewPlugin, EditorView } = CM.view;
  if (!docSuggestAnnotation) docSuggestAnnotation = CM.state.Annotation.define();
  if (!docSuggestEffect) docSuggestEffect = CM.state.StateEffect.define();
  const filter = CM.state.EditorState.transactionFilter.of((tr) => {
    if (!tr.docChanged || tr.annotation(docSuggestAnnotation) || !docSuggestActive()) return tr;
    if (!["input", "delete", "move"].some((event) => tr.isUserEvent(event))) return tr;
    const changes = [];
    tr.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => changes.push([fromA, toA, inserted.toString()]));
    const before = tr.startState.doc.toString();
    const backward = tr.isUserEvent("delete.backward");
    let text = before;
    let caret = 0;
    for (let i = changes.length - 1; i >= 0; i -= 1) {
      const [from, to, insert] = changes[i];
      const result = docSuggestEdit(text, from, to, insert, backward);
      text = result.text;
      if (i === 0) caret = result.caret;
    }
    let head = 0;
    const limit = Math.min(before.length, text.length);
    while (head < limit && before.charCodeAt(head) === text.charCodeAt(head)) head += 1;
    let tail = 0;
    while (tail < limit - head && before.charCodeAt(before.length - 1 - tail) === text.charCodeAt(text.length - 1 - tail)) {
      tail += 1;
    }
    return {
      changes: { from: head, to: before.length - tail, insert: text.slice(head, text.length - tail) },
      selection: { anchor: caret },
      scrollIntoView: true,
      annotations: [
        docSuggestAnnotation.of(true),
        CM.state.Transaction.userEvent.of(tr.annotation(CM.state.Transaction.userEvent) || "input"),
      ],
    };
  });

  function build(view) {
    const marks = [];
    const hidden = [];
    const hide = docView === "live";
    for (const mark of docSuggestParse(view.state.doc.toString())) {
      const cls = mark.kind === "ins" ? "cm-suggest-ins" : "cm-suggest-del";
      const title = mark.kind === "ins" ? "Suggested insertion: click to accept or reject" : "Suggested deletion: click to accept or reject";
      const edges = [[mark.start, mark.bodyStart], [mark.bodyEnd, mark.end]];
      for (const [from, to] of edges) {
        hidden.push(Decoration.replace({}).range(from, to));
        if (!hide) marks.push(Decoration.mark({ class: "cm-suggest-marker" }).range(from, to));
      }
      if (mark.bodyEnd > mark.bodyStart) {
        marks.push(
          Decoration.mark({ class: cls, attributes: { "data-doc-suggest": String(mark.start), title } }).range(mark.bodyStart, mark.bodyEnd)
        );
      }
    }
    return {
      decorations: Decoration.set(hide ? marks.concat(hidden) : marks, true),
      atomic: Decoration.set(hidden, true),
    };
  }

  const plugin = ViewPlugin.fromClass(
    class {
      constructor(view) {
        Object.assign(this, build(view));
      }
      update(update) {
        const told = update.transactions.some((tr) => tr.effects.length);
        if (update.docChanged || told) {
          Object.assign(this, build(update.view));
          renderDocSuggestState();
        }
      }
    },
    {
      decorations: (value) => value.decorations,
      eventHandlers: {
        mousedown(event, view) {
          const el = event.target instanceof Element && event.target.closest("[data-doc-suggest]");
          if (!el || event.button !== 0) return false;
          event.preventDefault();
          docSuggestMenu(view, Number(el.getAttribute("data-doc-suggest")), event.clientX, event.clientY);
          return true;
        },
      },
    }
  );
  return [
    filter,
    plugin,
    EditorView.atomicRanges.of((view) => view.plugin(plugin)?.atomic || Decoration.none),
  ];
}

function docSuggestApply(view, edit, message) {
  view.dispatch({
    changes: edit,
    annotations: [docSuggestAnnotation.of(true), window.CM6.state.Transaction.userEvent.of("input.review")],
  });
  if (message) toast(message);
}

//: The answers to one suggestion, at the pointer (or at the change, from the
//: keyboard). Recomputed from the text at the press: the mark is found again
//: by where it starts, and a mark no longer there says so.
function docSuggestMenu(view, start, x, y) {
  const mark = docSuggestParse(view.state.doc.toString()).find((m) => m.start === start);
  if (!mark || typeof openMenuAtPoint !== "function") return;
  const what = mark.kind === "ins" ? "insertion" : "deletion";
  const count = docSuggestParse(view.state.doc.toString()).length;
  const items = [
    { group: "one", label: `ph:check Accept this ${what}`, run: () => docSuggestApply(view, docSuggestResolve(mark, true)) },
    { group: "one", label: `ph:x Reject this ${what}`, run: () => docSuggestApply(view, docSuggestResolve(mark, false)) },
  ];
  if (count > 1) {
    items.push(
      { group: "all", label: `ph:checks Accept all ${count}`, run: () => docSuggestAll(true) },
      { group: "all", label: `ph:x-circle Reject all ${count}`, run: () => docSuggestAll(false) },
      { group: "all", label: "ph:arrow-down Next change", run: () => docSuggestNext() }
    );
  }
  openMenuAtPoint(items, `Suggested ${what}`, x, y);
}

function docSuggestAll(accept) {
  const view = docCmView;
  if (!view) return;
  const before = view.state.doc.toString();
  const count = docSuggestParse(before).length;
  if (!count) return toast("No suggested changes in this document.");
  docSuggestApply(
    view,
    { from: 0, to: before.length, insert: docSuggestResolveAll(before, accept) },
    `${accept ? "Accepted" : "Rejected"} ${count} change${count === 1 ? "" : "s"}. Ctrl+Z undoes it.`
  );
}

//: The next suggestion after the caret, wrapping, selected and answered: the
//: keyboard's way to every change, since a mark is otherwise a pointer target.
function docSuggestNext() {
  const view = docCmView;
  if (!view) return;
  const marks = docSuggestParse(view.state.doc.toString());
  if (!marks.length) return toast("No suggested changes in this document.");
  const here = view.state.selection.main.head;
  const mark = marks.find((m) => m.start > here) || marks[0];
  view.dispatch({ selection: { anchor: mark.bodyStart, head: mark.bodyEnd }, scrollIntoView: true });
  view.focus();
  requestAnimationFrame(() => {
    const at = view.coordsAtPos(mark.bodyStart) || view.contentDOM.getBoundingClientRect();
    docSuggestMenu(view, mark.start, at.left, at.bottom);
  });
}

//: The chip in the status bar and the rows in the ⋯ menu, from one count.
function renderDocSuggestState() {
  const on = docSuggestActive();
  const count = docCmView ? docSuggestParse(docCmView.state.doc.toString()).length : 0;
  const box = $("doc-suggest-mode");
  if (box) box.checked = on;
  const chip = $("doc-suggest-status");
  if (chip) {
    chip.hidden = !on && !count;
    const changes = `${count} change${count === 1 ? "" : "s"}`;
    setLabel(chip, `ph:pencil-simple-line ${on ? `Suggesting, ${changes}` : `${changes} suggested`}`);
    chip.title = count ? "Review the next suggested change" : "Suggestion mode is on: what you type and delete is marked for review";
  }
  for (const id of ["doc-suggest-next", "doc-suggest-accept-all", "doc-suggest-reject-all"]) {
    const row = $(id);
    if (row) row.hidden = !count;
  }
}

$("doc-suggest-mode")?.addEventListener("change", (event) => setDocSuggestMode(event.currentTarget.checked));
$("doc-suggest-next")?.addEventListener("click", () => docSuggestNext());
$("doc-suggest-accept-all")?.addEventListener("click", () => docSuggestAll(true));
$("doc-suggest-reject-all")?.addEventListener("click", () => docSuggestAll(false));
$("doc-suggest-status")?.addEventListener("click", () => docSuggestNext());
//: The rows are brought up to date as the menu opens, not only as the text
//: changes: opening a different document changes the answer without an edit.
$("doc-dock-menu")?.addEventListener("toggle", () => {
  renderDocSuggestState();
  renderDocReadAloudState();
});

// --- read aloud (INBOX 404) -----------------------------------------------------
//
// The browser's own `speechSynthesis`, with the voices the operating system
// already has: nothing to download and nothing leaves the machine, so it is
// offline by construction. One sentence per utterance, for two reasons: the
// sentence being spoken can be highlighted (an utterance has no reliable
// "where am I" for markdown the voice never sees), and Chromium cuts a long
// utterance off after about fifteen seconds with no event, which a sentence
// never reaches. Voices marked `localService` are preferred: Chrome also
// lists network voices, and a network voice is exactly what this app does
// not use.

//: Markdown read as words: the syntax is not said, a deletion suggested in
//: suggestion mode is not said, a link says its text and a comment nothing.
function docSpeakable(text) {
  return String(text || "")
    .replace(/\{--[\s\S]*?--\}/g, "")
    .replace(/\{\+\+|\+\+\}/g, "")
    .replace(/%%[^%\n]*%%/g, "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}(?:#{1,6}|>|[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?/, "")
    .replace(/\^[A-Za-z0-9-]+$/, "")
    .replace(/<[^>]+>/g, "")
    .replace(/[*_~=`|]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

//: The sentences of `text` between `from` and `to`, each with its span in
//: the document. Per line, because a heading or a list item has no full
//: stop and would otherwise run into the paragraph under it; fenced code is
//: not read.
function docReadAloudSentences(text, from, to) {
  const out = [];
  const segmenter =
    typeof Intl === "object" && typeof Intl.Segmenter === "function"
      ? new Intl.Segmenter(undefined, { granularity: "sentence" })
      : null;
  let fence = false;
  let at = 0;
  for (const line of text.split("\n")) {
    const start = at;
    at += line.length + 1;
    if (/^\s*(```|~~~)/.test(line)) {
      fence = !fence;
      continue;
    }
    if (fence || start + line.length < from || start >= to) continue;
    const pieces = segmenter
      ? [...segmenter.segment(line)].map((s) => [s.index, s.segment])
      : (line.match(/[^.!?]+[.!?]*\s*/g) || []).reduce((list, s) => {
          const index = list.length ? list[list.length - 1][0] + list[list.length - 1][1].length : 0;
          list.push([index, s]);
          return list;
        }, []);
    for (const [index, segment] of pieces) {
      const lead = segment.length - segment.trimStart().length;
      const s = start + index + lead;
      const e = start + index + segment.trimEnd().length;
      if (e <= s || e <= from || s >= to || !docSpeakable(segment)) continue;
      out.push({ from: Math.max(s, from), to: Math.min(e, to) });
    }
  }
  return out;
}

let docReadAloud = null;
let docReadAloudEffect = null;

function docReadAloudVoice(lang) {
  if (!window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  const local = voices.filter((voice) => voice.localService !== false);
  const prefix = String(lang || "en").slice(0, 2).toLowerCase();
  return (
    local.find((voice) => voice.default && voice.lang.toLowerCase().startsWith(prefix)) ||
    local.find((voice) => voice.lang.toLowerCase().startsWith(prefix)) ||
    local.find((voice) => voice.default) ||
    local[0] ||
    null
  );
}

//: From the selection, or from the start of the sentence the caret is in to
//: the end of the document.
function docReadAloudStart() {
  const view = docCmView;
  if (!view) return;
  if (!window.speechSynthesis || typeof SpeechSynthesisUtterance !== "function") {
    return toast("This window has no speech voices to read with.", true);
  }
  docReadAloudStop();
  const text = view.state.doc.toString();
  const selection = view.state.selection.main;
  const from = selection.empty ? view.state.doc.lineAt(selection.head).from : selection.from;
  const to = selection.empty ? text.length : selection.to;
  const queue = docReadAloudSentences(text, from, to).filter(
    (sentence) => !selection.empty || sentence.to > selection.head || sentence.to === text.length
  );
  if (!queue.length) return toast("Nothing to read from here.");
  docReadAloud = { queue, index: 0, docId: currentDoc && currentDoc.id, utterance: null };
  renderDocReadAloudState();
  docReadAloudNext();
}

function docReadAloudNext() {
  const state = docReadAloud;
  const view = docCmView;
  if (!state || !view) return;
  if (state.index >= state.queue.length || (currentDoc && currentDoc.id) !== state.docId) {
    return docReadAloudStop();
  }
  const sentence = state.queue[state.index];
  const words = docSpeakable(view.state.doc.sliceString(sentence.from, sentence.to));
  if (!words) {
    state.index += 1;
    return docReadAloudNext();
  }
  const utterance = new SpeechSynthesisUtterance(words);
  utterance.lang = document.documentElement.lang || navigator.language || "en";
  const voice = docReadAloudVoice(utterance.lang);
  try {
    if (voice) utterance.voice = voice;
  } catch {
    //: Not a voice this engine will take: its own default speaks instead.
  }
  utterance.onend = () => {
    if (docReadAloud !== state) return;
    state.index += 1;
    docReadAloudNext();
  };
  utterance.onerror = (event) => {
    if (docReadAloud !== state) return;
    if (event.error === "canceled" || event.error === "interrupted") return;
    toast(`Reading stopped: ${event.error || "the voice did not answer"}.`, true);
    docReadAloudStop();
  };
  //: Held on the state, not only in a closure: Chromium collects an
  //: utterance nothing references and then never fires its `end`.
  state.utterance = utterance;
  view.dispatch({
    effects: [
      docReadAloudEffect.of(sentence),
      window.CM6.view.EditorView.scrollIntoView(sentence.from, { y: "nearest" }),
    ],
  });
  try {
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    toast(`Reading stopped: ${error && error.message ? error.message : "the voice did not answer"}.`, true);
    docReadAloudStop();
  }
}

function docReadAloudStop() {
  const was = docReadAloud;
  docReadAloud = null;
  if (was && window.speechSynthesis) window.speechSynthesis.cancel();
  if (was && docCmView && docReadAloudEffect) docCmView.dispatch({ effects: docReadAloudEffect.of(null) });
  renderDocReadAloudState();
}

function renderDocReadAloudState() {
  const on = Boolean(docReadAloud);
  const row = $("doc-read-aloud");
  if (row) {
    setLabel(row, on ? "ph:stop Stop reading" : "ph:speaker-high Read aloud");
    row.setAttribute("aria-pressed", on ? "true" : "false");
  }
  const stop = $("doc-read-stop");
  if (stop) stop.hidden = !on;
}

//: The highlight, and the queue kept in step with typing while it reads: the
//: sentences still to come are moved through each edit, so reading carries
//: on over the words as they now are.
function docReadAloudExtension(CM) {
  const { Decoration, EditorView } = CM.view;
  if (!docReadAloudEffect) docReadAloudEffect = CM.state.StateEffect.define();
  const effect = docReadAloudEffect;
  const field = CM.state.StateField.define({
    create: () => Decoration.none,
    update(deco, tr) {
      let next = deco.map(tr.changes);
      for (const e of tr.effects) {
        if (!e.is(effect)) continue;
        next = e.value && e.value.to > e.value.from
          ? Decoration.set([Decoration.mark({ class: "cm-read-aloud" }).range(e.value.from, e.value.to)])
          : Decoration.none;
      }
      return next;
    },
    provide: (f) => EditorView.decorations.from(f),
  });
  return [
    field,
    EditorView.updateListener.of((update) => {
      if (!update.docChanged || !docReadAloud) return;
      for (const sentence of docReadAloud.queue) {
        sentence.from = update.changes.mapPos(sentence.from, 1);
        sentence.to = update.changes.mapPos(sentence.to, -1);
      }
    }),
    CM.state.Prec.high(
      CM.view.keymap.of([{ key: "Escape", run: () => (docReadAloud ? (docReadAloudStop(), true) : false) }])
    ),
  ];
}

$("doc-read-aloud")?.addEventListener("click", () => {
  const menu = $("doc-dock-menu");
  if (menu) menu.open = false;
  if (docReadAloud) docReadAloudStop();
  else docReadAloudStart();
});
$("doc-read-stop")?.addEventListener("click", () => docReadAloudStop());
//: Leaving the page stops the voice: speech outlives the tab otherwise.
window.addEventListener("pagehide", () => docReadAloudStop());

//: One hook in `docCmExtensions` for every tool in this region.
function docProseToolExtensions(CM) {
  return [docSuggestExtensions(CM), docReadAloudExtension(CM)];
}
// PROSE-TOOLS-END
