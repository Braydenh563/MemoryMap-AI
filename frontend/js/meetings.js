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
      body.append(
        meetingFormRow("Title", titleInput, "meeting-new-title"),
        meetingFormRow("When", whenInput, "meeting-new-when"),
        meetingFormRow("Who", people.field)
      );
      people.field.previousElementSibling.htmlFor = "meeting-new-people";
      people.input.id = "meeting-new-people";
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
      const make = async () => {
        create.disabled = true;
        status.classList.remove("error");
        let made = null;
        try {
          made = await apiJson("/meetings", {
            method: "POST",
            body: JSON.stringify({
              title: titleInput.value.trim(),
              when: whenInput.value || "",
              attendees: people.read(),
              notes,
            }),
          });
        } catch (error) {
          status.textContent = error.message || "Couldn't start the meeting.";
          status.classList.add("error");
          create.disabled = false;
          return;
        }
        close();
        await loadEntries().catch(() => {});
        if (then) then(made);
        //: Straight into the note: the meeting is where the writing happens.
        flashEntry(made.id);
        openNoteEditor(made.id);
        toastAction("Meeting started. Its action items, summary and recording are under its meeting chip.", "Open", () => openMeetingSheet(made.id));
      };
      create.addEventListener("click", make);
      for (const input of [titleInput, whenInput]) {
        input.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            make();
          }
        });
      }
      actions.append(cancel, create);
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
