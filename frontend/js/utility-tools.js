// utility-tools.js: the small tools the palette runs (UI_MODERNISATION_PLAN
// "Deepened 2026-10-10: utilities", rows 2 to 4; Brief 89).
//
// Lazy (`LAZY_MODULES.utilities`), reached from the palette's rows through
// the stand-ins in app.js: a timer and a stopwatch on the status bar's
// `#status-timer` chip (pressing it stops them, a timer that runs out says so
// in a toast and a notification), the counts of a selection in any editor
// (`textCounts`, held to `wc` by tests/test_text_utilities.py), and a
// template from Settings, Templates put in at the caret. The dashboard's
// Focus timer was the seed; it stays the widget's own, this one is the
// palette's and the bar's.

const utilityClock = { kind: "", name: "", start: 0, end: 0, tick: 0 };

function utilityTimeText(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

//: Seconds left (a timer) or gone (a stopwatch), from the clock rather than a
//: count of ticks, so a tab the browser throttled in the background still
//: reads true when it comes back.
function utilityClockSeconds() {
  const now = Date.now();
  if (utilityClock.kind === "timer") return Math.max(0, Math.ceil((utilityClock.end - now) / 1000));
  return Math.floor((now - utilityClock.start) / 1000);
}

function paintUtilityChip() {
  const chip = $("status-timer");
  if (!utilityClock.kind) {
    chip.classList.add("hidden");
    return;
  }
  const seconds = utilityClockSeconds();
  const time = utilityTimeText(seconds);
  setLabel(chip, `ph:stop-circle ${time}`);
  const what = utilityClock.kind === "timer" ? `${utilityClock.name} timer, ${time} left` : `Stopwatch, ${time}`;
  chip.title = `${what}. Press to stop`;
  chip.setAttribute("aria-label", `${what}. Stop`);
  chip.classList.remove("hidden");
  if (utilityClock.kind === "timer" && seconds === 0) utilityTimerDone();
}

function utilityClockRun(kind, name, seconds = 0) {
  clearInterval(utilityClock.tick);
  Object.assign(utilityClock, { kind, name, start: Date.now(), end: Date.now() + seconds * 1000 });
  //: The one wake source here: a second's tick while a clock is on the bar,
  //: cleared the moment it stops (tests/wake_sources_seed.json).
  utilityClock.tick = setInterval(paintUtilityChip, 1000);
  paintUtilityChip();
}

function utilityMinutesName(minutes) {
  if (minutes < 1) return `${Math.round(minutes * 60)} second`;
  if (minutes % 60 === 0) return `${minutes / 60} hour`;
  return `${Math.round(minutes * 10) / 10} minute`;
}

function startUtilityTimer(minutes = 25) {
  const span = Math.min(24 * 60, Math.max(1 / 60, Number(minutes) || 25));
  askNotificationPermission();
  utilityClockRun("timer", utilityMinutesName(span), Math.round(span * 60));
  const one = /^1 /.test(utilityClock.name);
  toast(`Timer started: ${utilityClock.name}${one ? "" : "s"}. Press it on the status bar to stop.`);
}

function startStopwatch() {
  utilityClockRun("stopwatch", "Stopwatch");
  toast("Stopwatch started. Press it on the status bar to stop.");
}

function stopUtilityClock() {
  if (!utilityClock.kind) return;
  const time = utilityTimeText(utilityClockSeconds());
  const said = utilityClock.kind === "timer" ? `Timer stopped with ${time} left.` : `Stopwatch stopped at ${time}.`;
  clearInterval(utilityClock.tick);
  utilityClock.kind = "";
  paintUtilityChip();
  toast(said);
}

function utilityTimerDone() {
  const name = utilityClock.name;
  clearInterval(utilityClock.tick);
  utilityClock.kind = "";
  paintUtilityChip();
  toast(`Time is up: the ${name} timer has finished.`);
  notify("MemoryMap", `Time is up: the ${name} timer has finished.`);
}

$("status-timer").addEventListener("click", stopUtilityClock);

//: The text a palette command acts on: what was selected when the palette
//: opened (`paletteCaught`, app-palette.js), else the whole of the editor
//: that had the focus.
function utilitySelectedText({ target, selection, start, end }) {
  if (target && typeof target.value === "string" && end > start) return { text: target.value.slice(start, end), whole: false };
  if (selection) return { text: selection, whole: false };
  if (target && typeof target.value === "string") return { text: target.value, whole: true };
  if (target?.isContentEditable) return { text: target.innerText, whole: true };
  return { text: "", whole: true };
}

function countSelection(caught) {
  const { text, whole } = utilitySelectedText(caught);
  if (!text.trim()) {
    toast("Select some text in an editor, then count it from the palette.");
    return;
  }
  const { words, chars, read } = textCounts(text);
  const noSpaces = text.replace(/\s/g, "").length;
  const what = whole ? "This editor" : "The selection";
  toast(`${what}: ${words.toLocaleString()} word${words === 1 ? "" : "s"}, ${chars.toLocaleString()} characters (${noSpaces.toLocaleString()} without spaces), ${read || "nothing to read"}.`);
}

//: A template's text (`noteTemplateForUse`: its date, time and clipboard
//: filled) goes in where the caret was when the palette opened: a text box
//: through `setRangeText` and an `input` event (so its draft, count and
//: rendering follow), a rich editor through the browser's own insert at the
//: range it held. With no editor in hand it goes at the end of Capture.
async function insertTemplate(template, caught) {
  const { text } = await noteTemplateForUse(template);
  let { target, start, end, range } = caught;
  if (!target?.isContentEditable && typeof target?.setRangeText !== "function") {
    await switchTab("notes");
    showNotesSection("capture");
    target = $("entry-content");
    start = end = target.value.length;
  }
  target.focus();
  if (target.isContentEditable) {
    if (range) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
    document.execCommand("insertText", false, text);
  } else {
    target.setRangeText(text, start ?? target.selectionStart, end ?? target.selectionEnd, "end");
    target.dispatchEvent(new Event("input", { bubbles: true }));
  }
  toast(`Inserted the ${template.name} template.`);
}
