// meetings.js: meeting notes (INBOX 644). Loaded on first use by
// `LAZY_MODULES.meetings` (app.js), whose stand-ins for `openNewMeeting` and
// `openMeetingSheet` fetch this file and call the real one: nothing here is
// needed until someone starts or opens a meeting.
//
// The owner: "Can you also redesign and expand and improve the meeting notes
// feature?? I feel like it is neglected and a bit left behind and tucked
// away." The audit (docs/roadmap/agent-remaining/meetings-644.md) found the
// one-click home entry opened a recorder, not a meeting, and four meeting
// shapes that disagreed. A meeting is now one thing: an ordinary note in one
// shape (`entry/meetings.py`), started from New meeting wherever things are
// started, and worked from one sheet: its action items (each one a reminder
// on demand), its decisions, Summarise with the words each line came from,
// and Record into it. Everything but Summarise works with no model.

//: The datetime field's value for "now", to the nearest five minutes: a
//: meeting starts at 14:00, not at 14:03:27.
function meetingNowValue(at = new Date()) {
  const d = new Date(at.getTime());
  d.setSeconds(0, 0);
  d.setMinutes(Math.round(d.getMinutes() / 5) * 5);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

//: "2026-10-07 14:00" (the note's own `date:`, a wall clock with no zone) as
//: words: "Wed 7 Oct, 14:00". A date alone has no time; anything that does
//: not read as a date is shown as written.
function meetingWhenText(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?$/.exec(String(value || "").trim());
  if (!m) return String(value || "");
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] || 0), Number(m[5] || 0));
  const day = d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  return m[4] ? `${day}, ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}` : day;
}

//: The people field: one chip per name and the field to type the next in,
//: Enter or a comma making a chip, Backspace in an empty field taking the
//: last. The note edit form's tag field (note-edit-panels.js), for names.
function meetingPeopleField(initial = []) {
  const people = [...initial];
  const field = document.createElement("div");
  field.className = "tag-field meeting-people prop-value";
  const input = document.createElement("input");
  input.type = "text";
  input.className = "note-edit-tag-input";
  input.placeholder = "Add a name";
  input.autocomplete = "off";
  input.setAttribute("aria-label", "Who is in this meeting: type a name, then Enter");
  const draw = () => {
    for (const old of field.querySelectorAll(".chip")) old.remove();
    for (const name of people) {
      const person = chip(`ph:user ${name}`, "tag", () => {
        people.splice(people.indexOf(name), 1);
        draw();
        input.focus();
      });
      person.append(Object.assign(document.createElement("i"), { className: "ph ph-x" }));
      person.title = `Remove ${name}`;
      person.setAttribute("aria-label", `Remove ${name}`);
      field.insertBefore(person, input);
    }
  };
  const commit = () => {
    const typed = input.value.split(",").map((t) => t.trim().replace(/^@/, "")).filter(Boolean);
    input.value = "";
    for (const name of typed) if (!people.some((p) => p.toLowerCase() === name.toLowerCase())) people.push(name);
    draw();
  };
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit();
    } else if (event.key === "Backspace" && !input.value && people.length) {
      people.pop();
      draw();
    }
  });
  //: A comma pasted or typed by a keyboard that sends no keydown for it.
  input.addEventListener("input", () => {
    if (input.value.includes(",")) commit();
  });
  input.addEventListener("blur", commit);
  field.appendChild(input);
  draw();
  return { field, input, read: () => (commit(), [...people]) };
}

function meetingFormRow(label, control, id) {
  const row = document.createElement("div");
  row.className = "prop-row";
  const name = document.createElement("label");
  name.className = "prop-key muted";
  name.textContent = label;
  if (id) {
    control.id = id;
    name.htmlFor = id;
  }
  row.append(name, control);
  return row;
}

//: **New meeting** (decision 1): a sheet with what a meeting is named, when
//: it is and who is in it, then the note itself in the editor, where the
//: agenda, notes, decisions and action items are written. `notes` and
//: `then` are the recorder's: a recording saved as a new meeting arrives
//: with its transcript under Notes.
async function openNewMeeting({ title = "", notes = "", then = null } = {}) {
  //: One at a time: a double click on a Create row (whose dialog fades
  //: rather than vanishing) pressed it twice and stacked two sheets.
  if (document.querySelector('[data-sheet="new-meeting"]')) return;
  openSheet({
    label: "New meeting",
    sub: "A note with an agenda, notes, decisions and action items.",
    name: "new-meeting",
    build: (card, close) => {
      card.classList.add("inbox-card", "meeting-new");
      const body = document.createElement("div");
      body.className = "inbox-body";
      const titleInput = document.createElement("input");
      titleInput.type = "text";
      titleInput.maxLength = 200;
      titleInput.className = "prop-value";
      titleInput.placeholder = "Weekly sync";
      titleInput.value = title;
      const whenInput = document.createElement("input");
      whenInput.type = "datetime-local";
      whenInput.className = "prop-value";
      whenInput.value = meetingNowValue();
      const people = meetingPeopleField();
      //: The title's chips (quickadd.js): "Sync with Ana friday 2pm" sets When
      //: as it is read and names Ana; a chip pressed off puts When back.
      let typedWhen = whenInput.value;
      let chipWhen = false;
      whenInput.addEventListener("input", () => {
        typedWhen = whenInput.value;
        chipWhen = false;
      });
      body.append(
        meetingFormRow("Title", titleInput, "meeting-new-title"),
        meetingFormRow("When", whenInput, "meeting-new-when"),
        meetingFormRow("Who", people.field)
      );
      people.field.previousElementSibling.htmlFor = "meeting-new-people";
      people.input.id = "meeting-new-people";
      quickAddAttach(titleInput, "meeting", {
        after: titleInput.closest(".prop-row"),
        onSlots: (slots) => {
          if (slots?.date || slots?.time) {
            whenInput.value = `${slots.date || typedWhen.slice(0, 10)}T${slots.time || typedWhen.slice(11, 16)}`;
            chipWhen = true;
          } else if (chipWhen) {
            whenInput.value = typedWhen;
            chipWhen = false;
          }
        },
      });
      const status = document.createElement("p");
      status.className = "status";
      status.setAttribute("role", "status");
      const actions = document.createElement("div");
      actions.className = "row right space-dialog-actions";
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.className = "ghost small";
      cancel.textContent = "Cancel";
      cancel.addEventListener("click", close);
      const create = document.createElement("button");
      create.type = "button";
      create.className = "accent small";
      create.id = "meeting-new-create";
      setLabel(create, "ph:users-three Start the meeting");
      //: `record`: "Start and record" (INBOX 704: the redesign took the
      //: recorder's tile away and left recording two levels deep): the
      //: meeting is made, then the recorder opens writing into its Notes.
      const make = async (record = false) => {
        create.disabled = true;
        recordButton.disabled = true;
        status.classList.remove("error");
        let made = null;
        try {
          const slots = await quickAddSlots(titleInput);
          const attendees = people.read();
          for (const name of slots?.people || []) {
            if (!attendees.some((p) => p.toLowerCase() === name.toLowerCase())) attendees.push(name);
          }
          made = await apiJson("/meetings", {
            method: "POST",
            body: JSON.stringify({
              title: slots ? slots.title : titleInput.value.trim(),
              when: whenInput.value || "",
              attendees,
              notes,
            }),
          });
        } catch (error) {
          status.textContent = error.message || "Couldn't start the meeting.";
          status.classList.add("error");
          create.disabled = false;
          recordButton.disabled = false;
          return;
        }
        close();
        //: The one note it made, not a re-read of the notebook (the
        //: refresh ratchet, tests/test_refresh_entries.py).
        await refreshEntries([made.id]).catch(() => {});
        if (then) then(made);
        //: Straight into the note: the meeting is where the writing happens.
        flashEntry(made.id);
        if (record) return meetingRecordInto(made.id);
        openNoteEditor(made.id);
        toastAction("Meeting started. Its action items, summary and recording are under its meeting chip.", "Open", () => openMeetingSheet(made.id));
      };
      const recordButton = document.createElement("button");
      recordButton.type = "button";
      recordButton.className = "ghost small";
      recordButton.id = "meeting-new-record";
      recordButton.title = "Start the meeting and transcribe it as it happens, on this computer";
      setLabel(recordButton, "ph:microphone Start and record");
      recordButton.addEventListener("click", () => make(true));
      create.addEventListener("click", () => make());
      for (const input of [titleInput, whenInput]) {
        input.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            make();
          }
        });
      }
      actions.append(cancel, recordButton, create);
      card.append(body, status, actions);
      requestAnimationFrame(() => titleInput.focus());
    },
  });
}

//: An action item's row: the box (done or not), the task and its owner, and
//: the reminder it has or a press to make one. The row recipe (DESIGN.md, "A
//: row in a list"): mark, content, one actions cell centred on the row.
function meetingActionRow(entryId, item, redraw) {
  const li = document.createElement("li");
  li.className = "meeting-action";
  if (item.done) li.classList.add("is-done");
  const mark = document.createElement("i");
  mark.className = `ph ${item.done ? "ph-check-square" : "ph-square"} meeting-action-mark`;
  mark.setAttribute("aria-hidden", "true");
  const main = document.createElement("span");
  main.className = "meeting-action-main";
  const text = document.createElement("span");
  text.className = "meeting-action-text";
  text.textContent = item.text;
  main.appendChild(text);
  const facts = [];
  if (item.done) facts.push("Done");
  if (item.owner) facts.push(`Owner ${item.owner}`);
  if (item.reminder_due) {
    const due = parseServerTime(item.reminder_due) || new Date(item.reminder_due);
    facts.push(`Reminder ${due.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`);
  }
  if (facts.length) {
    const line = document.createElement("span");
    line.className = "muted meeting-action-facts";
    line.textContent = facts.join(" · ");
    main.appendChild(line);
  }
  const act = document.createElement("span");
  act.className = "meeting-action-act";
  if (item.reminder_id) {
    act.appendChild(smallButton("ph:alarm Show", "Open this reminder in Reminders", () => {
      switchTab("reminders");
    }));
  } else if (!item.done) {
    const remind = smallButton("ph:alarm Remind me", "Make this action item a reminder: when it says, or when you say", () => meetingRemind(entryId, item, remind, redraw));
    remind.classList.add("meeting-remind");
    act.appendChild(remind);
  }
  li.append(mark, main, act);
  return li;
}

async function meetingRemind(entryId, item, button, redraw, when = "") {
  button.disabled = true;
  try {
    const made = await apiJson(`/entries/${entryId}/meeting/remind`, {
      method: "POST",
      body: JSON.stringify({ line: item.line, when, tz_offset_minutes: -new Date().getTimezoneOffset() }),
    });
    const due = parseServerTime(made.due_at) || new Date(made.due_at);
    toastAction(`Reminder set for ${due.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}.`, "Show", () => switchTab("reminders"));
    redraw();
  } catch (error) {
    button.disabled = false;
    //: The line says no time: ask for one, read by the same rules.
    if (error.status === 422 && !when) {
      const asked = await promptDialog(`When should “${item.text}” remind you?`, "tomorrow at 9am", { confirmLabel: "Remind me" });
      if (asked) return meetingRemind(entryId, item, button, redraw, asked);
      return;
    }
    toast(error.message || "Couldn't make that reminder.", true);
  }
}

//: **The meeting sheet**: when and who in its head, the action items, the
//: decisions, and three things to do with the meeting. Reached from the
//: meeting chip on the note's details line, the note's ⋯ menu, and after
//: New meeting.
async function openMeetingSheet(entryId) {
  let data = null;
  try {
    data = await apiJson(`/entries/${entryId}/meeting`);
  } catch (error) {
    toast(error.message || "Couldn't open that meeting.", true);
    return;
  }
  const entry = (typeof allEntries !== "undefined" ? allEntries : []).find((e) => e.id === entryId);
  const when = data.date ? meetingWhenText(data.date) : "No date yet";
  const who = data.attendees.length ? data.attendees.join(", ") : "nobody named yet";
  openSheet({
    label: entry?.title || "Meeting",
    sub: `${when} · ${who}`,
    name: "meeting",
    build: (card, close) => {
      card.classList.add("inbox-card", "meeting-view");
      const body = document.createElement("div");
      body.className = "inbox-body";
      const redraw = async () => {
        try {
          data = await apiJson(`/entries/${entryId}/meeting`);
        } catch {
          return;
        }
        fill();
      };
      const actionsHead = document.createElement("h3");
      actionsHead.textContent = "Action items";
      const actionsList = document.createElement("ul");
      actionsList.className = "meeting-actions-list";
      const decisionsHead = document.createElement("h3");
      decisionsHead.textContent = "Decisions";
      const decisionsList = document.createElement("ul");
      decisionsList.className = "meeting-decisions";
      const proposal = document.createElement("div");
      proposal.className = "meeting-proposal hidden";
      proposal.setAttribute("aria-live", "polite");
      const fill = () => {
        actionsList.replaceChildren();
        for (const item of data.actions) actionsList.appendChild(meetingActionRow(entryId, item, redraw));
        if (!data.actions.length) {
          const none = document.createElement("li");
          none.className = "muted meeting-empty";
          none.textContent = "None yet. Write them as “- [ ] Send the deck @Sam by Friday” under Action items.";
          actionsList.appendChild(none);
        }
        decisionsList.replaceChildren();
        for (const text of data.decisions) {
          const li = document.createElement("li");
          li.textContent = text;
          decisionsList.appendChild(li);
        }
        if (!data.decisions.length) {
          const none = document.createElement("li");
          none.className = "muted meeting-empty";
          none.textContent = "None yet. Write them under Decisions, or let Summarise find them in your notes.";
          decisionsList.appendChild(none);
        }
      };
      fill();
      body.append(actionsHead, actionsList, decisionsHead, decisionsList, proposal);

      const status = document.createElement("p");
      status.className = "status";
      status.setAttribute("role", "status");
      const bar = document.createElement("div");
      bar.className = "row right space-dialog-actions meeting-view-actions";
      const details = smallButton("ph:users Date and people", "Change when it was and who was there", () => {
        close();
        const target = (typeof allEntries !== "undefined" ? allEntries : []).find((e) => e.id === entryId);
        if (target) openNotePropertiesSheet(target);
      });
      const record = smallButton("ph:microphone Record into it", "Record, transcribe on this machine, and add the transcript under Notes", () => {
        close();
        meetingRecordInto(entryId);
      });
      const summarise = smallButton("ph:sparkle Summarise", "Find the decisions and action items in your notes, each with the words it came from", () =>
        meetingSummarise(entryId, proposal, status, summarise, redraw)
      );
      summarise.id = "meeting-summarise";
      bar.append(details, record, summarise);
      card.append(body, status, bar);
    },
  });
}

//: **Summarise** (decision 3): the server keeps only the lines whose source
//: words are in the note; this shows them with those words and adds them
//: only when asked, after the person's own lines, with Undo.
async function meetingSummarise(entryId, proposal, status, button, redraw) {
  button.disabled = true;
  status.classList.remove("error");
  setLabel(status, "ph:spin Reading your notes…");
  let result = null;
  try {
    result = await apiJson(`/entries/${entryId}/meeting/summarise`, { method: "POST" });
  } catch (error) {
    status.textContent = error.message || "Couldn't summarise this meeting.";
    status.classList.add("error");
    button.disabled = false;
    return;
  }
  button.disabled = false;
  const lines = [...result.lines.decisions, ...result.lines.actions];
  const dropped = result.dropped
    ? ` ${result.dropped === 1 ? "One line had" : `${result.dropped} lines had`} no source in your notes and ${result.dropped === 1 ? "was" : "were"} left out.`
    : "";
  if (!lines.length) {
    status.textContent = `Nothing to add: no decision or action item was found in the notes.${dropped}`;
    return;
  }
  status.textContent = "";
  proposal.replaceChildren();
  proposal.classList.remove("hidden");
  const head = document.createElement("p");
  head.className = "muted";
  head.textContent = `Found ${result.decisions.length} ${result.decisions.length === 1 ? "decision" : "decisions"} and ${result.actions.length} action ${result.actions.length === 1 ? "item" : "items"}, each with the words it came from.${dropped}`;
  const list = document.createElement("ul");
  list.className = "meeting-proposal-list";
  for (const item of [...result.decisions.map((d) => ({ ...d, kind: "Decision" })), ...result.actions.map((a) => ({ ...a, kind: "Action" }))]) {
    const li = document.createElement("li");
    const what = document.createElement("span");
    what.textContent = `${item.kind}: ${item.text}${item.owner ? ` (${item.owner})` : ""}`;
    const cite = document.createElement("q");
    cite.className = "muted meeting-cite";
    cite.textContent = item.quote;
    li.append(what, cite);
    list.appendChild(li);
  }
  const row = document.createElement("div");
  row.className = "row right";
  const discard = smallButton("Discard", "Leave the note as it is", () => {
    proposal.classList.add("hidden");
    proposal.replaceChildren();
  });
  const add = smallButton("ph:plus Add to the meeting", "Add these after your own lines under Decisions and Action items", async () => {
    add.disabled = true;
    try {
      const before = await apiJson(`/entries/${entryId}`);
      const send = (section, items) =>
        items.length
          ? apiJson(`/entries/${entryId}/meeting/append`, { method: "POST", body: JSON.stringify({ section, lines: items }) })
          : null;
      await send("Decisions", result.lines.decisions);
      await send("Action items", result.lines.actions);
      const undo = async () => {
        await apiJson(`/entries/${entryId}`, { method: "PUT", body: JSON.stringify({ content: before.content }) });
        await refreshEntries([entryId]);
      };
      const redo = async () => {
        await send("Decisions", result.lines.decisions);
        await send("Action items", result.lines.actions);
        await refreshEntries([entryId]);
      };
      pushUndo("Added the meeting summary", undo, redo);
      toastAction("Added to the meeting.", "Undo", async () => {
        await undo();
        redraw();
      });
      proposal.classList.add("hidden");
      proposal.replaceChildren();
      await refreshEntries([entryId]).catch(() => {});
      redraw();
    } catch (error) {
      add.disabled = false;
      toast(error.message || "Couldn't add that.", true);
    }
  }, false);
  add.classList.add("accent");
  row.append(discard, add);
  proposal.append(head, list, row);
}

//: **A recording saved** (media.js's Save as a meeting / Add to the meeting):
//: under the Notes of the meeting it was opened from, after what is already
//: there, or a new meeting in the one shape dated now with the transcript
//: under Notes. The uncited summary this save used to prepend is gone: a
//: line nobody can check against the transcript is not one to file under
//: the person's name; the meeting sheet's Summarise cites every line.
async function meetingSaveTranscript(content, title, target) {
  const status = $("meeting-status");
  const button = $("meeting-save");
  button.disabled = true;
  status.classList.remove("error");
  setLabel(status, "ph:spin Saving…");
  try {
    const saved = target !== null
      ? await apiJson(`/entries/${target}/meeting/append`, {
        method: "POST",
        body: JSON.stringify({ section: "Notes", lines: [content] }),
      })
      : await apiJson("/meetings", {
        method: "POST",
        body: JSON.stringify({ title: title || `Recording ${new Date().toLocaleDateString()}`, when: meetingNowValue(), notes: content }),
      });
    await loadEntries();
    // The overlay is about to close, so this jumps straight to the note
    // rather than leaving an "offer" button behind in a dialog nobody is
    // looking at anymore; `flashEntry` handles its own navigation.
    closeMeetingRecorder();
    flashEntry(saved.id);
    toastAction(
      target !== null ? "Transcript added under Notes." : "Saved as a meeting. Summarise finds its decisions and action items.",
      "Open the meeting",
      () => openMeetingSheet(saved.id)
    );
  } catch (error) {
    status.textContent = error.message;
    status.classList.add("error");
  } finally {
    button.disabled = false;
  }
}

//: The recorder, aimed at one meeting: its transcript goes under that
//: meeting's Notes. `.meeting-into` hides the name field (the meeting has
//: its name) and swaps the save's words (02-chat-graph.css).
function meetingRecordInto(entryId) {
  openMeetingRecorder();
  $("meeting-overlay").dataset.target = String(entryId);
  $("meeting-overlay").classList.add("meeting-into");
}

//: Moved from media.js (boot) on 2026-10-06: the recorder is only reached
//: through openMeetingRecorder, a stand-in in LAZY_ENTRY_POINTS.meetings.
// --- meeting notes (§17) -------------------------------------------------------------
//
// The backlog's own "highest-value single addition still unbuilt": the quick
// microphone button above is sized for a spoken note (server caps it at 25MB,
// `routes_voice.py`'s own comment says "a spoken note, not a podcast"), a
// meeting or a lecture needs a separate flow with its own recording cap, a
// visible elapsed timer so a long recording doesn't feel stalled, and a
// review step before the transcript becomes a note, the same "you're in
// control before it's saved" shape the persona-peek and compression-summary
// features already use elsewhere.
//
// **A recording is a meeting's, not a note of its own** (INBOX 644). Saved,
// a transcript becomes a meeting note in the one shape (`POST /meetings`,
// the transcript under Notes), or goes under Notes of the meeting it was
// opened from (`openMeetingRecorder({ entryId })`, the meeting sheet's
// Record into it). The action items and decisions are the meeting sheet's
// (meetings.js): each item a reminder on demand, and Summarise, whose every
// line carries the words it came from. The uncited summary this save used
// to prepend is gone: a line nobody can check against the transcript is
// not one to file under the person's name. faster-whisper is not installed
// in the sandbox, so the transcription itself is untested past its request
// shape (CLAUDE.md's standing caveat).

let meetingRecorder = null;
let meetingStream = null;
let meetingChunks = [];
let meetingTimerHandle = null;
let meetingStartedAt = 0;

function meetingElapsedText() {
  const seconds = Math.max(0, Math.round((Date.now() - meetingStartedAt) / 1000));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

//: How many amplitude samples the waveform holds. About four seconds at the
//: sample rate below, which is enough to see the shape of a sentence without
//: the line becoming a texture.
const MEETING_WAVE_POINTS = 140;
//: Frames between samples. Every frame would fill the window in two seconds
//: and spend a redraw on a difference nobody can see.
const MEETING_WAVE_EVERY = 3;

//: Kept at module level so `closeMeetingRecorder` can stop a draw loop that
//: `toggleMeetingRecording` started: the two are different user actions and
//: neither can reach the other's locals.
let stopMeetingWave = () => {};

// The line that moves while you talk. See the note in index.html for why the
// six-bar meter on the Record button was not enough: a recording with no
// visible response to your voice is indistinguishable from a broken
// microphone, and that is what was actually being reported.
function startMeetingWave(stream) {
  const canvas = document.getElementById("meeting-wave");
  if (!canvas) return () => {};
  let ctx;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  } catch {
    return () => {}; // no Web Audio: the recording itself is unaffected
  }
  const analyser = ctx.createAnalyser();
  // 2048 in the *time* domain: this draws a level line, and a bigger window
  // gives a steadier RMS than the 256-bin frequency analyser the button meter
  // uses. Both can run at once, they are separate nodes on the same stream.
  analyser.fftSize = 2048;
  ctx.createMediaStreamSource(stream).connect(analyser);
  const samples = new Uint8Array(analyser.fftSize);
  const levels = new Array(MEETING_WAVE_POINTS).fill(0);

  const paint = canvas.getContext("2d");
  canvas.classList.remove("hidden");
  // Size the backing store to the box it is actually drawn in, at the
  // device's own pixel density. The markup's 960×120 is a fallback for the
  // frame before layout; leaving it there stretches the line horizontally and
  // makes it soft on any HiDPI screen. Measured after `remove("hidden")`, 
  // a hidden element has no width to read.
  const box = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  if (box.width) {
    canvas.width = Math.round(box.width * ratio);
    canvas.height = Math.round(box.height * ratio);
  }
  let frame = null;
  let ticks = 0;
  let stopped = false;

  function draw() {
    const { width, height } = canvas;
    const middle = height / 2;
    paint.clearRect(0, 0, width, height);
    // The accent, read from the live stylesheet rather than hard-coded, so
    // the line follows whatever theme is set, including a custom one.
    const accent =
      getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() ||
      "#4664f0";
    paint.strokeStyle = accent;
    paint.lineWidth = 2;
    paint.lineJoin = "round";
    paint.lineCap = "round";
    const step = width / (levels.length - 1);
    // Two mirrored strokes rather than one: a level line drawn only upward
    // reads as a graph, and the symmetrical pair reads as sound.
    for (const direction of [-1, 1]) {
      paint.beginPath();
      levels.forEach((level, i) => {
        const y = middle + direction * level * (middle - 4);
        if (i === 0) paint.moveTo(0, y);
        else paint.lineTo(i * step, y);
      });
      paint.stroke();
    }
  }

  function tick() {
    if (stopped) return;
    if (ticks % MEETING_WAVE_EVERY === 0) {
      analyser.getByteTimeDomainData(samples);
      // RMS around the 128 midpoint, the honest measure of loudness, and
      // steadier than a peak, which flickers on consonants.
      let sum = 0;
      for (let i = 0; i < samples.length; i++) {
        const value = (samples[i] - 128) / 128;
        sum += value * value;
      }
      const rms = Math.sqrt(sum / samples.length);
      // sqrt again for the same reason the bar meter gives: ordinary speech
      // sits low in the range and a linear map leaves it near the floor.
      levels.push(Math.min(1, Math.sqrt(rms) * 1.6));
      levels.shift();
      draw();
    }
    ticks++;
    frame = requestAnimationFrame(tick);
  }

  // Chrome creates an AudioContext suspended even inside a click handler, and
  // the analyser reads all-zero until it is running, the same trap the bar
  // meter documents. Start the loop after resume resolves.
  ctx.resume().then(tick, tick);

  return () => {
    stopped = true;
    if (frame) cancelAnimationFrame(frame);
    ctx.close().catch(() => {});
    canvas.classList.add("hidden");
    paint.clearRect(0, 0, canvas.width, canvas.height);
  };
}

function stopMeetingTimer() {
  if (meetingTimerHandle) clearInterval(meetingTimerHandle);
  meetingTimerHandle = null;
}

//: **One state at a time** (INBOX 708, "these panels feel badly designed and
//: neglected"). The recorder was five things on screen at once whatever it was
//: doing: a Record button that was sometimes Stop, a clock reading 0:00 before
//: anything had started, a Pause that said Resume after the recording it
//: belonged to had ended, and a transcript box twelve rem tall around one
//: sentence. Now the card says which state it is in (`data-state`) and shows
//: only what that state needs:
//:   ready          Record (the one filled control)
//:   recording      Stop (filled), Pause, the clock, the level line
//:   paused         Stop (filled), Resume, the clock stopped
//:   transcribing   a progress bar and how long the audio was
//:   review         the transcript, sized to its words, and the save actions
function setMeetingState(state) {
  $("meeting-card").dataset.state = state;
  const live = state === "recording" || state === "paused";
  $("meeting-stage").classList.toggle("hidden", state === "review");
  $("meeting-controls").classList.toggle("hidden", !(live || state === "ready"));
  $("meeting-pause").classList.toggle("hidden", !live);
  $("meeting-timer").classList.toggle("hidden", !live);
  $("meeting-progress").classList.toggle("hidden", state !== "transcribing");
  const review = state === "review";
  $("meeting-transcript").classList.toggle("hidden", !review);
  $("meeting-save-row").classList.toggle("hidden", !review);
  stagePrimary("meeting-record", "meeting-save", review);
}

// Resets the overlay to "ready to record", whether it's opening fresh or
// coming back after a discard, the same state either way.
function resetMeetingUI() {
  stopMeetingTimer();
  $("meeting-timer").textContent = "0:00";
  $("meeting-status").textContent = "";
  $("meeting-status").classList.remove("error");
  $("meeting-transcript").value = "";
  $("meeting-record").disabled = false;
  $("meeting-record").classList.remove("recording");
  setLabel($("meeting-record"), "ph:record Record");
  setLabel($("meeting-pause"), "ph:pause Pause");
  $("meeting-wave")?.classList.add("hidden");
  setMeetingState("ready");
}

//: The meeting a recording goes into, or null for a new one: set by the
//: meeting sheet's Record into it (meetings.js `meetingRecordInto`), which
//: also puts `.meeting-into` on the overlay (the name field goes, the save
//: says where the words land). Every other way in is a new meeting.
//: Held on the overlay (`data-target`), not a top-level `let` (the
//: global-scope ratchet).

async function openMeetingRecorder() {
  overlayReturnFocus = document.activeElement;
  delete $("meeting-overlay").dataset.target;
  $("meeting-overlay").classList.remove("meeting-into");
  resetMeetingUI();
  $("meeting-overlay").classList.remove("hidden");
  $("meeting-record").focus();
}

// Recording is stopped (discarded, not transcribed) rather than left running
// in the background: a MediaRecorder with no owner is a live microphone
// nobody is looking at.
function closeMeetingRecorder() {
  if (meetingRecorder && meetingRecorder.state !== "inactive") {
    // A discard is not transcribed: the stop listener reads this (`onstop = null`
    // here removed nothing, the listener is an `addEventListener` one).
    meetingRecorder.discarded = true;
    meetingRecorder.stop();
  }
  meetingStream?.getTracks().forEach((t) => t.stop());
  stopMeetingWave();
  stopMeetingWave = () => {};
  meetingRecorder = null;
  meetingStream = null;
  stopMeetingTimer();
  $("meeting-overlay").classList.add("hidden");
  overlayReturnFocus?.focus?.();
  overlayReturnFocus = null;
}

async function toggleMeetingRecording() {
  const button = $("meeting-record");
  if (meetingRecorder) {
    button.disabled = true; // one press, not a double-fire while it stops
    // The clock keeps the length of the audio: stopped while recording it is
    // up to a second stale, stopped while paused it is already right.
    if (meetingRecorder.state === "recording") $("meeting-timer").textContent = meetingElapsedText();
    // A paused recorder holds what it has heard so far; asking for it before
    // the stop makes the last chunk arrive on every engine, not only the ones
    // that flush on a stop from paused (INBOX 708: Stop from Paused).
    if (meetingRecorder.state === "paused") meetingRecorder.requestData();
    meetingRecorder.stop();
    return;
  }
  if (voiceStatus === null) {
    voiceStatus = await apiJson("/voice/status").catch(() => ({ available: false }));
  }
  if (!voiceStatus.available) {
    $("meeting-status").textContent = voiceStatus.hint || "Voice capture isn't available.";
    $("meeting-status").classList.add("error");
    return;
  }
  try {
    meetingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    $("meeting-status").textContent = "Microphone access was blocked, allow it in your browser.";
    $("meeting-status").classList.add("error");
    return;
  }
  meetingChunks = [];
  const recorder = new MediaRecorder(meetingStream);
  meetingRecorder = recorder;
  let stopMeetingLevelMeter = () => {};
  meetingRecorder.addEventListener("dataavailable", (e) => meetingChunks.push(e.data));
  meetingRecorder.addEventListener("stop", async () => {
    meetingStream?.getTracks().forEach((t) => t.stop());
    stopMeetingLevelMeter();
    stopMeetingWave();
    stopMeetingWave = () => {};
    meetingStream = null;
    meetingRecorder = null;
    stopMeetingTimer();
    if (recorder.discarded) return;
    const length = $("meeting-timer").textContent;
    button.classList.remove("recording");
    setLabel(button, "ph:record Record");
    setLabel($("meeting-pause"), "ph:pause Pause");
    button.disabled = false;
    const blob = new Blob(meetingChunks, { type: meetingChunks[0]?.type || "audio/webm" });
    const form = new FormData();
    form.append("file", blob, "meeting.webm");
    $("meeting-status").classList.remove("error");
    $("meeting-status").textContent = `Transcribing ${length} of audio. A long recording can take a while on CPU.`;
    setMeetingState("transcribing");
    try {
      const body = await (await api.upload("/voice/transcribe-meeting", form)).json();
      const text = (body.text || "").trim();
      if (!text) {
        // Nothing to review is not a transcript: say so, and put Record back.
        $("meeting-timer").textContent = "0:00";
        setMeetingState("ready");
        $("meeting-status").textContent = "Nothing was heard in that recording.";
        return;
      }
      $("meeting-status").textContent = `Transcript of ${length}. Read it, trim it, then save.`;
      $("meeting-transcript").value = body.text;
      setMeetingState("review");
      autoGrow($("meeting-transcript"));
      $("meeting-transcript").focus();
    } catch (error) {
      setMeetingState("ready");
      $("meeting-status").textContent = error.message;
      $("meeting-status").classList.add("error");
    }
  });
  meetingRecorder.start();
  meetingStartedAt = Date.now();
  $("meeting-timer").textContent = meetingElapsedText();
  meetingTimerHandle = setInterval(() => {
    $("meeting-timer").textContent = meetingElapsedText();
  }, 1000);
  button.classList.add("recording");
  setLabel(button, "ph:stop Stop");
  // Appended after setLabel, not before: setLabel's replaceChildren() wipes
  // every child on the button, and the bar meter startMicLevelMeter() builds
  // is one: appending it earlier just got it discarded a line later.
  stopMeetingLevelMeter = startMicLevelMeter(meetingStream, button);
  stopMeetingWave = startMeetingWave(meetingStream);
  setMeetingState("recording");
  $("meeting-status").textContent = "Recording.";
  $("meeting-status").classList.remove("error");
}

// Pause and resume, which a MediaRecorder supports directly, the chunks
// simply stop arriving and the recording continues where it left off. Asked
// for as part of "expanded as a proper feature with more capabilities", and
// it is the one a real meeting needs: someone leaves the room, a side
// conversation starts, and the alternative today is stopping and starting a
// second recording that transcribes as a separate transcript.
//
// The elapsed timer is corrected on resume rather than left running: it is
// showing how long the *recording* is, and a paused stretch is not in it.
let meetingPausedAt = 0;

function toggleMeetingPause() {
  if (!meetingRecorder) return;
  const button = $("meeting-pause");
  if (meetingRecorder.state === "recording") {
    meetingRecorder.pause();
    meetingPausedAt = Date.now();
    stopMeetingTimer();
    setLabel(button, "ph:play Resume");
    setMeetingState("paused");
    $("meeting-status").textContent = "Paused. Resume to keep recording, or stop to transcribe.";
  } else if (meetingRecorder.state === "paused") {
    meetingRecorder.resume();
    // Push the start forward by however long the pause lasted, so the timer
    // keeps reading as the length of the audio rather than of the sitting.
    meetingStartedAt += Date.now() - meetingPausedAt;
    meetingTimerHandle = setInterval(() => {
      $("meeting-timer").textContent = meetingElapsedText();
    }, 1000);
    setLabel(button, "ph:pause Pause");
    setMeetingState("recording");
    $("meeting-status").textContent = "Recording.";
  }
}

// An hour of transcript is not a note. In the Notes list it is one enormous
// card nobody can scroll past; as a document it is something you can open,
// edit, extract notes from and export, which is what the rest of this app
// already does well with long text.
async function saveMeetingDocument() {
  const content = $("meeting-transcript").value.trim();
  if (!content) return;
  const status = $("meeting-status");
  const button = $("meeting-save-doc");
  button.disabled = true;
  status.classList.remove("error");
  status.textContent = "Saving…";
  try {
    const title =
      ($("meeting-title")?.value || "").trim() ||
      `Recording: ${new Date().toLocaleString()}`;
    const document_ = await apiJson("/documents", {
      method: "POST",
      body: JSON.stringify({ title, content }),
    });
    closeMeetingRecorder();
    switchTab("documents");
    openDocument(document_.id);
    toast(`Saved “${title}” to your documents.`);
  } catch (error) {
    status.textContent = error.message || "Couldn't save that.";
    status.classList.add("error");
  } finally {
    button.disabled = false;
  }
}

//: The save itself is meetings.js's (`meetingSaveTranscript`, the lazy
//: bundle the meeting sheet is in): a new meeting in the one shape, or the
//: transcript under the Notes of the meeting it was opened from. The title,
//: when one was typed, names the meeting (every list shows a note's first
//: line as its name; without one a recording was named by its first word).
async function saveMeetingNote() {
  const content = $("meeting-transcript").value.trim();
  if (content && (await ensureModule("meetings"))) await meetingSaveTranscript(content, ($("meeting-title")?.value || "").trim(), Number($("meeting-overlay").dataset.target) || null);
}
