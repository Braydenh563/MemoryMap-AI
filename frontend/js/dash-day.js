// dash-day.js: the dashboard's day digest line, moved out of dashboard.js on 2026-10-12 for the boot gzip budget; `LAZY_ENTRY_POINTS.dashDay` (app.js) stands in, nobody reads its return.

//: **The day, from the engine** (CHAT_PLAN section 2, the dashboard row):
//: what is due, the open questions, what changed since yesterday and the
//: topics gone quiet, from `/insights/day` with no model. Every line is a
//: count or words quoted from one note or reminder, and a quote opens where
//: it came from. The model's week stays below, on request.
async function renderDayDigest(box) {
  let day;
  try {
    day = await apiJson("/insights/day", { silent: true });
  } catch {
    box.replaceChildren();
    return;
  }
  //: The dashboard's own list (`.dash-list`): every line opens where it came
  //: from, a quote its note or the reminders, a count the list it counted.
  const list = document.createElement("ul");
  list.className = "dash-list digest-day-lines";
  const opens = {
    due: () => switchTab("reminders"),
    questions: async () => {
      await switchTab("notes");
      showNotesSection("questions");
    },
    changed: () => switchTab("notes"),
    quiet: async (line) => {
      await switchTab("notes");
      showCategoryNotes(line.category);
    },
  };
  for (const line of day.lines || []) {
    const li = document.createElement("li");
    li.className = line.kind === "quote" ? "digest-day-line muted text-sm" : "digest-day-line";
    li.dataset.kind = line.kind;
    li.dataset.part = line.part;
    const source = line.source || {};
    const open = source.entry_id ? () => flashEntry(source.entry_id) : () => opens[line.part](line);
    //: The link is inside the item: an `li` given `role="link"` stops being a
    //: list item, and axe's `list` rule (serious) fails the `ul` for it. The
    //: whole row still takes the click; the words take the keys.
    const link = document.createElement("span");
    link.setAttribute("role", "link");
    link.tabIndex = 0;
    //: A quote is the note's own words, Markdown and all: plain here (INBOX 820).
    link.textContent = notePreviewText(flattenNoteMarkdown(line.text));
    link.addEventListener("keydown", (event) => {
      if (event.key === "Enter") open();
    });
    li.appendChild(link);
    li.addEventListener("click", open);
    list.appendChild(li);
  }
  if (!list.childElementCount) {
    const quiet = document.createElement("p");
    quiet.className = "muted";
    quiet.textContent = day.empty || "";
    box.replaceChildren(quiet);
    return;
  }
  box.replaceChildren(list);
}
