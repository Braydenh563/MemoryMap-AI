// field-clear.js: a Clear control on the boxes people type into (INBOX 466,
// the owner: "a clear button on the note capture tab and in other main text
// areas where the user might want to quick clear their work").
//
// A lazy piece (app.js `LAZY_MODULES.fieldClear`, loaded a few seconds after
// boot, like quick-note.js: the boot scripts are at their gzip cap). The
// buttons are in index.html, `hidden`; this file shows each only while its box
// holds something, and wires the click: the words go, the toast offers Undo
// (`toastAction`, the app's one undo recipe) and Undo puts back the words, the
// title, the tags and the staged files, merging with anything typed since
// rather than overwriting it. Escape is not touched: it keeps what it did.
//
// **No `value` setter is wrapped to notice a script clearing a box** (a send,
// a save): Capture's own box already owns one (documents.js
// `noteSurfaceOwnValue`), and a second would shadow it. A one-second check of
// five booleans while the page is visible does the job instead.

const FIELD_CLEARS = [
  {
    button: "capture-clear",
    fields: ["entry-content", "entry-title", "entry-tags"],
    //: Files staged for Save go with the words, and come back with them.
    held: () => (typeof captureStagedFiles !== "undefined" ? captureStagedFiles.length : 0),
    take() {
      const files = captureStagedFiles;
      captureStagedFiles = [];
      renderCaptureFiles();
      return files;
    },
    put(files) {
      captureStagedFiles = [...files, ...captureStagedFiles];
      renderCaptureFiles();
    },
    after() {
      if (typeof clearCaptureTagSuggestions === "function") clearCaptureTagSuggestions();
      if (typeof focusCaptureBox === "function") focusCaptureBox();
    },
  },
  //: A modal dialog or overlay is drawn above the toasts, so its Undo is on its own status line.
  { button: "quick-note-clear", fields: ["quick-note-text"], status: "quick-note-status" },
  { button: "ask-clear", fields: ["question"] },
  { button: "chat-clear", fields: ["chat-input"] },
  { button: "command-palette-clear", fields: ["command-palette-input"], status: "command-palette-status" },
];

function fieldClearBoxes(spec) {
  return spec.fields.map((id) => document.getElementById(id)).filter(Boolean);
}

function fieldClearSync(spec) {
  const button = document.getElementById(spec.button);
  if (!button) return;
  const full = fieldClearBoxes(spec).some((box) => box.value.trim()) || (spec.held ? spec.held() > 0 : false);
  button.classList.toggle("hidden", !full);
}

//: Sets a box and tells the page it changed, so the counter, the draft kept
//: in storage, the tag suggestions and the box's height all follow.
function fieldClearWrite(box, value) {
  box.value = value;
  box.dispatchEvent(new Event("input", { bubbles: true }));
  if (typeof autoGrow === "function" && box.tagName === "TEXTAREA") autoGrow(box);
}

function fieldClearRun(spec) {
  const boxes = fieldClearBoxes(spec);
  const words = boxes.map((box) => box.value);
  const held = spec.take ? spec.take() : null;
  if (!words.some((w) => w.trim()) && !(held && held.length)) return;
  for (const box of boxes) fieldClearWrite(box, "");
  if (spec.after) spec.after();
  else boxes[0]?.focus();
  fieldClearSync(spec);
  const undo = () => {
    boxes.forEach((box, at) => {
      const typed = box.value.trim();
      const was = words[at];
      //: Typed since: the old words go in front, never over the new ones.
      fieldClearWrite(box, typed && was ? `${was}${box.tagName === "TEXTAREA" ? "\n\n" : " "}${box.value}` : was || box.value);
    });
    if (spec.put && held) spec.put(held);
    boxes[0]?.focus();
    fieldClearSync(spec);
  };
  const line = spec.status && document.getElementById(spec.status);
  if (!line) return toastAction("Cleared.", "Undo", undo);
  const redo = document.createElement("button");
  redo.type = "button";
  redo.className = "link-button";
  redo.textContent = "Undo";
  line.classList.remove("error");
  line.replaceChildren("Cleared. ", redo);
  const gone = () => line.replaceChildren();
  const timer = setTimeout(gone, 8000);
  redo.addEventListener("click", () => {
    clearTimeout(timer);
    gone();
    undo();
  });
  boxes[0].addEventListener("input", () => { clearTimeout(timer); gone(); }, { once: true });
}

//: **A value written by code moves the button too, without a poll** (audit
//: 2026-10-05, FE-18). Code fills these boxes without an `input` event (a
//: draft loaded into Capture, "Ask about this" filling the question), so the
//: X used to be re-synced by a one-second interval for the whole session.
//: Each box's own `value` setter is wrapped instead: the native setter runs,
//: then the button is synced, once, in a microtask.
function fieldClearWatchValue(box, spec) {
  let proto = Object.getPrototypeOf(box);
  let native = null;
  while (proto && !native) {
    native = Object.getOwnPropertyDescriptor(proto, "value");
    proto = Object.getPrototypeOf(proto);
  }
  if (!native || !native.set || Object.prototype.hasOwnProperty.call(box, "value")) return;
  let queued = false;
  Object.defineProperty(box, "value", {
    configurable: true,
    enumerable: native.enumerable,
    get() {
      return native.get.call(this);
    },
    set(next) {
      native.set.call(this, next);
      if (queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        fieldClearSync(spec);
      });
    },
  });
}

//: The staged files in Capture are the one thing here that is not a value:
//: their list calls this when it redraws (`renderCaptureFiles`).
function fieldClearSyncAll() {
  for (const spec of FIELD_CLEARS) fieldClearSync(spec);
}

(() => {
  for (const spec of FIELD_CLEARS) {
    const button = document.getElementById(spec.button);
    if (!button) continue;
    button.addEventListener("click", () => fieldClearRun(spec));
    for (const box of fieldClearBoxes(spec)) {
      box.addEventListener("input", () => fieldClearSync(spec));
      box.addEventListener("change", () => fieldClearSync(spec));
      fieldClearWatchValue(box, spec);
    }
    fieldClearSync(spec);
  }
})();
