// Lazily loaded (LAZY_MODULES.categories in app.js): the Manage categories
// panel and its merge, split, delete and new-category flows run only when
// the panel or a category's menu is used, so they stay off the boot
// scripts' gzip budget (tests/test_static_compression.py).

//: **The panel, redesigned** (the owner, of the first draft: "needs some ui
//: redesign and modernisation/professionalisation refinement ... can you
//: also do those button redesigns like the ai assistant panel in the
//: documents editor"). The head is DESIGN.md's dialog head (the Documents AI
//: assistant's): the title, its '?' beside it, a ghost icon Close at the
//: right. One line of description, then one tool row: a filter field and
//: New category. The categories are a grid of quiet rows (the colour dot,
//: the name, a muted count pill and a ghost ⋯ that shows on hover or focus,
//: always on touch), with a roving focus: arrows and Home/End move, Space
//: selects, Enter shows the category's notes, F2 renames, Delete deletes,
//: and the context-menu key or Shift+F10 opens the ⋯. Selecting rows raises
//: a sticky footer to merge or delete them together. The card is sized to
//: its content up to its cap and the list is its one scroller.
async function openManageCategories(focusName = null) {
  await loadCategories();
  openSheet({
    label: "Manage categories",
    name: "categories",
    onClose: () => { manageCategoriesRedraw = null; },
    build: (card, close) => {
      card.classList.add("manage-cat-card");
      manageCatHead(card, close);
      const sub = document.createElement("p");
      sub.className = "muted manage-cat-sub";
      sub.textContent = "Rename, merge, split or delete categories. Your notes are always kept.";
      const helpBody = document.createElement("div");
      helpBody.className = "help-body hidden";
      helpBody.id = "manage-cat-help";
      helpBody.setAttribute("role", "dialog");
      helpBody.setAttribute("aria-label", "About managing categories");
      for (const line of [
        "Merge into folds one category into another: all its notes move across. Select several with Space to merge or delete them together.",
        `Split moves some of a category's notes into a new one. Pick them yourself, or have groups suggested, by their tags or by ${aiNameNow()}, and review them first.`,
        "Colour picks the dot a category wears on its notes, the graph and the timeline. Automatic goes back to a colour chosen from its name.",
        "Delete asks where its notes should go. Nothing you write is ever deleted here, and every change can be undone.",
        "To move particular notes, tick them in the list and choose Move to, or drag a note's category label onto another category in the sidebar.",
        "Keys: arrows move, Space selects, Enter shows the notes, F2 renames, Delete deletes.",
      ]) {
        const p = document.createElement("p");
        p.textContent = line;
        helpBody.appendChild(p);
      }
      const tools = document.createElement("div");
      tools.className = "manage-cat-tools";
      const filter = document.createElement("input");
      filter.type = "search";
      filter.className = "manage-cat-filter";
      filter.placeholder = "Filter categories";
      filter.setAttribute("aria-label", "Filter categories");
      //: A search field says so: a leading magnifier, and a clear that shows
      //: once there is something to clear (the owner: "the filter has no
      //: search icon").
      const search = document.createElement("span");
      search.className = "manage-cat-search";
      const glass = document.createElement("i");
      glass.className = "ph ph-magnifying-glass manage-cat-search-icon";
      glass.setAttribute("aria-hidden", "true");
      const clear = smallButton("ph:x", "Clear the filter", () => {
        filter.value = "";
        filter.dispatchEvent(new Event("input"));
        filter.focus();
      });
      clear.classList.add("manage-cat-clear", "hidden");
      clear.setAttribute("aria-label", "Clear the filter");
      search.append(glass, filter, clear);
      const create = smallButton("ph:plus New category", "Make an empty category to move notes into", () => createCategoryFromPanel());
      tools.append(search, create);
      const list = document.createElement("ul");
      list.className = "manage-cat-list";
      //: A grid, not a listbox (INBOX 433): an option may hold nothing
      //: interactive, and each row carries its ⋯ (axe-core's
      //: nested-interactive, WCAG 4.1.2, counted 7). A grid's cell may: the
      //: rows are selected as rows, the first cell is the roving stop.
      list.setAttribute("role", "grid");
      list.setAttribute("aria-multiselectable", "true");
      list.setAttribute("aria-label", "Categories");
      const footer = document.createElement("div");
      footer.className = "manage-cat-footer hidden";
      footer.setAttribute("role", "region");
      footer.setAttribute("aria-label", "Selected categories");
      card.append(sub, helpBody, tools, list, footer);
      initHelpToggles(card);
      const state = { selected: new Set(), active: focusName, filter: "" };
      const redraw = () => drawManageCategoryRows(list, footer, state);
      manageCategoriesRedraw = redraw;
      filter.addEventListener("input", () => {
        state.filter = filter.value.trim().toLowerCase();
        clear.classList.toggle("hidden", !filter.value);
        redraw();
      });
      //: Down from the filter walks into the list.
      filter.addEventListener("keydown", (event) => {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          list.querySelector(".manage-cat-main")?.focus();
        }
      });
      wireManageCategoryKeys(list, state, redraw);
      redraw();
      //: After the sheet's own first-button focus, which would land on the '?'.
      const start = focusName ? list.querySelector(`[data-category="${CSS.escape(focusName)}"] > .manage-cat-main`) : null;
      requestAnimationFrame(() => (start || filter).focus());
    },
  });
}

//: The doc-ai head built into the sheet's own head: the '?' goes beside the
//: title, and the Close moves into the icon group as a ghost icon.
function manageCatHead(card, close) {
  const head = card.querySelector(".sheet-head");
  if (!head) return;
  head.classList.add("dialog-head");
  const help = document.createElement("button");
  help.type = "button";
  help.className = "icon-only ghost small dialog-head-btn";
  help.setAttribute("data-help-for", "manage-cat-help");
  help.setAttribute("aria-controls", "manage-cat-help");
  help.setAttribute("aria-expanded", "false");
  help.title = "About managing categories";
  help.setAttribute("aria-label", "About managing categories");
  const helpIcon = document.createElement("i");
  helpIcon.className = "ph ph-question";
  helpIcon.setAttribute("aria-hidden", "true");
  help.appendChild(helpIcon);
  const closeButton = head.querySelector(".sheet-close");
  closeButton?.classList.add("dialog-head-btn");
  const actions = document.createElement("span");
  actions.className = "dialog-head-actions";
  if (closeButton) actions.appendChild(closeButton);
  head.querySelector(".sheet-title")?.after(help);
  head.appendChild(actions);
  void close;
}

function drawManageCategoryRows(list, footer, state) {
  //: The focus is on a row's first cell (or its ⋯); the row says which.
  const hadFocus = list.contains(document.activeElement)
    ? document.activeElement.closest("[data-category]")?.dataset.category || null
    : null;
  list.replaceChildren();
  const shown = [...categoryMeta.values()].filter((meta) => !state.filter || meta.name.toLowerCase().includes(state.filter));
  for (const name of [...state.selected]) if (!categoryMeta.has(name)) state.selected.delete(name);
  if (!shown.length) {
    const none = document.createElement("li");
    none.className = "muted manage-cat-empty";
    none.setAttribute("role", "row");
    const cell = document.createElement("span");
    cell.setAttribute("role", "gridcell");
    cell.textContent = state.filter ? "No category matches that." : "No categories yet.";
    none.appendChild(cell);
    list.appendChild(none);
  }
  const current = shown.some((meta) => meta.name === (hadFocus || state.active)) ? (hadFocus || state.active) : shown[0]?.name;
  for (const meta of shown) {
    const li = document.createElement("li");
    li.className = "manage-cat-row";
    li.dataset.category = meta.name;
    li.setAttribute("role", "row");
    li.setAttribute("aria-selected", String(state.selected.has(meta.name)));
    //: The row's stop and its name: the dot, the name and the count, one
    //: cell, so arrowing down the grid reads "Work, 3 notes" per row.
    const main = document.createElement("span");
    main.className = "manage-cat-main";
    main.setAttribute("role", "gridcell");
    main.tabIndex = meta.name === current ? 0 : -1;
    const dot = document.createElement("span");
    dot.className = "manage-cat-dot";
    paintCategoryDot(dot, meta.name);
    dot.setAttribute("aria-hidden", "true");
    const name = document.createElement("span");
    name.className = "manage-cat-name";
    name.textContent = meta.name;
    name.title = meta.name;
    const count = document.createElement("span");
    count.className = "manage-cat-count";
    count.textContent = String(meta.count);
    count.title = `${meta.count} note${meta.count === 1 ? "" : "s"}`;
    main.setAttribute("aria-label", `${meta.name}, ${meta.count} note${meta.count === 1 ? "" : "s"}`);
    main.append(dot, name, count);
    li.appendChild(main);
    if (meta.name !== "Uncategorised") {
      const menu = kebabMenu(categoryMenuItems(meta, { inPanel: true }), `Actions for ${meta.name}`);
      menu.classList.add("manage-cat-menu");
      menu.setAttribute("role", "gridcell");
      menu.addEventListener("click", (event) => event.stopPropagation());
      menu.addEventListener("keydown", (event) => {
        event.stopPropagation();
        //: Left from the ⋯ goes back to the row's first cell, as Right
        //: came here (`wireManageCategoryKeys`).
        if (event.key === "ArrowLeft" && event.target === menu.querySelector(":scope > button")) {
          event.preventDefault();
          main.focus();
        }
      });
      li.appendChild(menu);
    } else {
      const spacer = document.createElement("span");
      spacer.className = "manage-cat-spacer";
      spacer.setAttribute("role", "gridcell");
      li.appendChild(spacer);
    }
    //: A click selects (with Ctrl or Shift it adds to the selection); a
    //: double click shows the category's notes.
    li.addEventListener("click", (event) => {
      if (meta.name === "Uncategorised") return showCategoryNotes(meta.name);
      if (!(event.ctrlKey || event.metaKey || event.shiftKey)) {
        const only = state.selected.size === 1 && state.selected.has(meta.name);
        state.selected.clear();
        if (!only) state.selected.add(meta.name);
      } else if (state.selected.has(meta.name)) state.selected.delete(meta.name);
      else state.selected.add(meta.name);
      state.active = meta.name;
      drawManageCategoryRows(list, footer, state);
      list.querySelector(`[data-category="${CSS.escape(meta.name)}"] > .manage-cat-main`)?.focus();
    });
    li.addEventListener("dblclick", () => showCategoryNotes(meta.name));
    list.appendChild(li);
  }
  if (hadFocus) list.querySelector(`[data-category="${CSS.escape(hadFocus)}"] > .manage-cat-main`)?.focus();
  drawManageCategoryFooter(footer, state, () => drawManageCategoryRows(list, footer, state));
}

//: The assignments a click on the sidebar's row makes (`renderSidebar`), for
//: the panel's Enter and the category chip's "Show notes in" (INBOX 447 (5)).
//: `clearSearch` empties the box first: from a card that is showing a search
//: or a tag, "show this category" means this category, not its overlap.
function showCategoryNotes(name, { clearSearch = false } = {}) {
  //: The notes are behind the panel, so the panel gets out of their way
  //: (INBOX 432: the list filtered under an open modal).
  document.querySelector('.sheet-overlay[data-sheet="categories"] .sheet-close')?.click();
  if (clearSearch) {
    noteSearch = "";
    const box = $("note-search");
    if (box) box.value = "";
  }
  activeCategory = name;
  draftsOnly = false;
  favouritesOnly = false;
  if (localStorage.getItem("activeTab") !== "notes") switchTab("notes");
  showNotesSection("browse");
  renderSidebar();
  renderEntries();
}

//: The grid's keys, on the list so they survive every redraw. They act from
//: a row's first cell, `.manage-cat-main`, the one stop of the grid; the ⋯
//: cell keeps its own keys (its menu stops them) bar Left, which comes back.
function wireManageCategoryKeys(list, state, redraw) {
  list.addEventListener("keydown", (event) => {
    if (!event.target.matches?.(".manage-cat-main")) return;
    const row = event.target.closest("[data-category]");
    if (!row) return;
    const rows = [...list.querySelectorAll(".manage-cat-row")];
    const at = rows.indexOf(row);
    const move = (to) => {
      const next = rows[Math.max(0, Math.min(rows.length - 1, to))];
      if (!next) return;
      for (const r of rows) r.querySelector(":scope > .manage-cat-main").tabIndex = r === next ? 0 : -1;
      state.active = next.dataset.category;
      next.querySelector(":scope > .manage-cat-main").focus();
      next.scrollIntoView({ block: "nearest" });
    };
    const meta = categoryMeta.get(row.dataset.category);
    if (event.key === "ArrowDown") move(at + 1);
    else if (event.key === "ArrowUp") move(at - 1);
    else if (event.key === "Home") move(0);
    else if (event.key === "End") move(rows.length - 1);
    else if (event.key === "ArrowRight") row.querySelector(".manage-cat-menu > button")?.focus();
    else if (event.key === " ") {
      if (meta && meta.name !== "Uncategorised") {
        if (state.selected.has(meta.name)) state.selected.delete(meta.name);
        else state.selected.add(meta.name);
        redraw();
      }
    } else if (event.key === "Enter") showCategoryNotes(row.dataset.category);
    else if (event.key === "F2" && meta && meta.name !== "Uncategorised") renameCategory(meta, meta.name);
    else if ((event.key === "Delete" || event.key === "Backspace") && meta && meta.name !== "Uncategorised") deleteCategoryFromPanel(meta);
    else if (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey)) row.querySelector(".manage-cat-menu > button")?.click();
    else return;
    event.preventDefault();
  });
}

//: The sticky footer: shown while rows are selected, with what can be done
//: to them together.
function drawManageCategoryFooter(footer, state, redraw) {
  footer.replaceChildren();
  const names = [...state.selected].filter((name) => categoryMeta.has(name));
  footer.classList.toggle("hidden", names.length === 0);
  if (!names.length) return;
  const label = document.createElement("span");
  label.className = "manage-cat-footer-label";
  label.textContent = `${names.length} selected`;
  const clear = smallButton("Clear", "Clear the selection", () => { state.selected.clear(); redraw(); });
  const merge = smallButton("ph:arrows-merge Merge into…", "Move every note in the selected categories into one category", async () => {
    await mergeCategoriesFromPanel(names.map((name) => categoryMeta.get(name)));
    state.selected.clear();
    redraw();
  }, false);
  const remove = smallButton("ph:trash Delete…", "Delete the selected categories; their notes are kept", async () => {
    for (const name of names) {
      const meta = categoryMeta.get(name);
      if (meta) await deleteCategoryFromPanel(meta);
    }
    state.selected.clear();
    redraw();
  });
  footer.append(label, clear, remove, merge);
}

//: Several categories folded into one, one undo for the lot.
async function mergeCategoriesFromPanel(metas) {
  if (metas.length === 1) return mergeCategoryFromPanel(metas[0]);
  const names = metas.map((m) => m.name);
  const target = await chooseCategorySheet({ label: `Merge ${metas.length} categories into`, sub: "Their notes move across and they go.", exclude: null, excludeAll: names });
  if (!target) return;
  const done = [];
  try {
    for (const meta of metas) {
      const result = await apiJson(`/categories/${meta.id}/merge`, { method: "POST", body: JSON.stringify({ into: target.id }) });
      done.push(result);
      if (activeCategory === meta.name) activeCategory = result.into;
    }
  } catch (error) {
    toast(error.message, true);
  }
  if (!done.length) return;
  offerCategoryUndo(
    `Merged ${done.length} categories into "${target.name}".`,
    async () => {
      for (const result of done) {
        if (result.moved_ids.length) await apiJson("/categories/move", { method: "POST", body: JSON.stringify({ entry_ids: result.moved_ids, category: result.from }) });
        else await apiJson("/categories", { method: "POST", body: JSON.stringify({ name: result.from }) });
      }
    },
    async () => {
      const ids = done.flatMap((result) => result.moved_ids);
      if (ids.length) await apiJson("/categories/move", { method: "POST", body: JSON.stringify({ entry_ids: ids, category: target.name }) });
    }
  );
  await refreshAfterCategoryChange();
}

//: The one list of what can be done to a category: the panel's ⋯ and the
//: sidebar row's ⋯ both draw from it.

async function createCategoryFromPanel() {
  const name = await promptDialog("Name the new category:", "", { confirmLabel: "Create" });
  if (!name || !name.trim()) return;
  try {
    const made = await apiJson("/categories", { method: "POST", body: JSON.stringify({ name: name.trim() }) });
    toast(made.created ? `Made "${made.name}".` : `"${made.name}" already exists.`);
    await refreshAfterCategoryChange();
  } catch (error) {
    toast(error.message, true);
  }
}

//: A choice of category in a sheet of its own: every other category as a
//: row, and optionally Uncategorised; answers the chosen meta or null.
function chooseCategorySheet({ label, sub, exclude, excludeAll = [], includeUncategorised = false }) {
  return new Promise((resolve) => {
    let chosen = null;
    openSheet({
      label,
      sub,
      name: "category-choice",
      onClose: () => resolve(chosen),
      build: (card, close) => {
        const list = document.createElement("div");
        list.className = "sheet-list";
        //: Uncategorised is offered whether or not it exists yet: deleting
        //: a category on a fresh notebook had no "keep them unfiled" choice
        //: (INBOX 432). In the sidebar's order, after it.
        const metas = [...categoryMeta.values()].sort((a, b) => compareCategoryNames(a.name, b.name));
        if (includeUncategorised && !categoryMeta.has("Uncategorised")) metas.push({ name: "Uncategorised", id: null, count: 0 });
        for (const meta of metas) {
          if (meta.name === exclude || excludeAll.includes(meta.name)) continue;
          if (meta.name === "Uncategorised" && !includeUncategorised) continue;
          list.appendChild(sheetRow("ph ph-folder", `${meta.name} (${meta.count})`, () => { chosen = meta; close(); }));
        }
        if (!list.children.length) {
          const none = document.createElement("p");
          none.className = "muted";
          none.textContent = "There is no other category yet. Make one with New category.";
          list.appendChild(none);
        }
        card.appendChild(list);
      },
    });
  });
}

async function mergeCategoryFromPanel(meta) {
  const target = await chooseCategorySheet({ label: `Merge ${meta.name} into`, sub: `Its ${meta.count} note${meta.count === 1 ? "" : "s"} move across and ${meta.name} goes.`, exclude: meta.name });
  if (!target) return;
  try {
    const result = await apiJson(`/categories/${meta.id}/merge`, { method: "POST", body: JSON.stringify({ into: target.id }) });
    if (activeCategory === meta.name) activeCategory = result.into;
    const ids = result.moved_ids;
    offerCategoryUndo(
      `Merged "${result.from}" into "${result.into}".`,
      () => (ids.length ? apiJson("/categories/move", { method: "POST", body: JSON.stringify({ entry_ids: ids, category: result.from }) }) : apiJson("/categories", { method: "POST", body: JSON.stringify({ name: result.from }) })),
      () => apiJson("/categories/move", { method: "POST", body: JSON.stringify({ entry_ids: ids.length ? ids : [0], category: result.into }) }).catch(() => null)
    );
    await refreshAfterCategoryChange();
  } catch (error) {
    toast(error.message, true);
  }
}

async function deleteCategoryFromPanel(meta) {
  const target = meta.count
    ? await chooseCategorySheet({ label: `Delete ${meta.name}`, sub: `Where should its ${meta.count} note${meta.count === 1 ? "" : "s"} go? Nothing is deleted but the category.`, exclude: meta.name, includeUncategorised: true })
    : { name: "Uncategorised", id: null };
  if (!target) return;
  try {
    const into = target.name === "Uncategorised" ? "" : `?into=${target.id}`;
    const result = await apiJson(`/categories/${meta.id}${into}`, { method: "DELETE" });
    if (activeCategory === meta.name) activeCategory = null;
    const ids = result.moved_ids;
    offerCategoryUndo(
      `Deleted "${result.name}". Its notes are in ${result.into || "Uncategorised"}.`,
      () => (ids.length ? apiJson("/categories/move", { method: "POST", body: JSON.stringify({ entry_ids: ids, category: result.name }) }) : apiJson("/categories", { method: "POST", body: JSON.stringify({ name: result.name }) })),
      async () => {
        await loadCategories();
        const again = categoryMeta.get(result.name);
        if (again) await apiJson(`/categories/${again.id}${into}`, { method: "DELETE" });
      }
    );
    await refreshAfterCategoryChange();
  } catch (error) {
    toast(error.message, true);
  }
}

//: Split: the category's notes with a tick each and a name for the new
//: category, or Suggest a split, which groups them by their tags for review
//: (POST .../split/propose moves nothing); each group applies on its own.
function splitCategoryFromPanel(meta) {
  const notes = allEntries.filter((e) => e.category === meta.name && !e.is_draft);
  openSheet({
    label: `Split ${meta.name}`,
    sub: "Tick the notes to move and name their new category, or let a split be suggested.",
    name: "category-split",
    build: (card, close) => {
      const form = document.createElement("form");
      form.className = "manage-split";
      const nameInput = document.createElement("input");
      nameInput.type = "text";
      nameInput.maxLength = 100;
      nameInput.placeholder = "New category name";
      nameInput.setAttribute("aria-label", "New category name");
      const list = document.createElement("div");
      list.className = "sheet-list manage-split-list";
      const boxes = new Map();
      for (const entry of notes) {
        const label = document.createElement("label");
        label.className = "checkbox-label manage-split-note";
        const box = document.createElement("input");
        box.type = "checkbox";
        boxes.set(entry.id, box);
        //: The note's words, markdown stripped, clamped to two lines with an
        //: ellipsis by the CSS: an 80-character slice cut each row off
        //: mid-sentence with nothing to say it went on ("...Timeline and").
        const text = document.createElement("span");
        //: A note with no text of its own (an image, a voice note) has no
        //: `content` to cut: it threw here and the sheet never opened.
        text.className = "manage-split-text";
        text.textContent = entry.title || stripMarkdownPreview(String(entry.content || "").slice(0, 240)).replace(/\s+/g, " ").trim() || "Untitled note";
        label.title = text.textContent;
        label.append(box, text);
        list.appendChild(label);
      }
      const suggestions = document.createElement("div");
      suggestions.className = "manage-split-suggestions";
      const row = document.createElement("div");
      row.className = "row confirm-actions";
      //: Two ways to a suggestion (INBOX 431 (e)): by the notes' tags, which
      //: needs nothing, or Ask AI, which has the utility model read the
      //: notes; with the model off the tags answer, and the line says so.
      const propose = async (ai) => {
        //: The model can take a while on a big category: the button says it
        //: is working and cannot be pressed twice meanwhile.
        const button = ai ? askAi : suggest;
        setBusy(button, true);
        const proposal = await apiJson(`/categories/${meta.id}/split/propose${ai ? "?ai=true" : ""}`, { method: "POST" })
          .catch((e) => { toast(e.message, true); return null; })
          .finally(() => setBusy(button, false));
        if (!proposal) return;
        suggestions.replaceChildren();
        //: One line, whichever way it went: two stacked paragraphs ("couldn't
        //: suggest" then "no split to suggest") took 120px of a short sheet.
        const line = (text) => {
          const p = document.createElement("p");
          p.className = "muted manage-split-line";
          p.textContent = text;
          suggestions.appendChild(p);
        };
        if (!proposal.groups.length) {
          line(proposal.ai_unavailable
            ? `${aiNameNow()} couldn't suggest a split just now, and no two notes here share a tag the rest do not. Pick notes by hand.`
            : "No two notes here share a tag that the rest do not, so there is no split to suggest. Pick notes by hand.");
          return;
        }
        if (proposal.ai_unavailable) line(`${aiNameNow()} couldn't suggest a split just now, so these are grouped by tags.`);
        for (const group of proposal.groups) {
          const pick = smallButton(`ph:check-square ${group.name} (${group.entry_ids.length})`, `Tick these ${group.entry_ids.length} notes and name the category ${group.name}`, () => {
            for (const [id, box] of boxes) box.checked = group.entry_ids.includes(id);
            nameInput.value = group.name;
            nameInput.focus();
          });
          pick.type = "button";
          suggestions.appendChild(pick);
        }
      };
      const suggest = smallButton("ph:tag Suggest by tags", "Group these notes by their tags, to review before anything moves", () => propose(false));
      const askAi = smallButton(`ph:sparkle Ask ${aiNameNow()}`, `Have ${aiNameNow()} read these notes and suggest groups, to review before anything moves`, () => propose(true));
      askAi.type = "button";
      //: Inside a form every button submits unless told otherwise.
      suggest.type = "button";
      const apply = document.createElement("button");
      apply.type = "submit";
      apply.className = "small";
      apply.textContent = "Move to new category";
      row.append(suggest, askAi, apply);
      form.append(nameInput, suggestions, list, row);
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const name = nameInput.value.trim();
        const ids = [...boxes].filter(([, box]) => box.checked).map(([id]) => id);
        if (!name) { toast("Name the new category first.", true); nameInput.focus(); return; }
        if (!ids.length) { toast("Tick the notes to move first.", true); return; }
        //: One split per press: a second Enter or click while the first is
        //: on its way asked the server to split notes already moved.
        if (apply.disabled) return;
        setBusy(apply, true);
        try {
          const result = await apiJson(`/categories/${meta.id}/split`, { method: "POST", body: JSON.stringify({ name, entry_ids: ids }) });
          close();
          const moved = result.moved_ids;
          offerCategoryUndo(
            `Moved ${moved.length} note${moved.length === 1 ? "" : "s"} from "${result.from}" into "${result.name}".`,
            () => apiJson("/categories/move", { method: "POST", body: JSON.stringify({ entry_ids: moved, category: result.from }) }),
            () => apiJson("/categories/move", { method: "POST", body: JSON.stringify({ entry_ids: moved, category: result.name }) })
          );
          await refreshAfterCategoryChange();
        } catch (error) {
          toast(error.message, true);
        } finally {
          setBusy(apply, false);
        }
      });
      card.appendChild(form);
      setTimeout(() => nameInput.focus(), 0);
    },
  });
}

// --- Moved from notes-list.js (INBOX 432): category actions that only ever
// run on a click, so they load with this panel instead of at boot. Boot code
// reaches them through LAZY_ENTRY_POINTS (app.js).

async function renameCategory(meta, currentName) {
  const name = await promptDialog(`Rename "${currentName}" to:`, currentName, { confirmLabel: "Rename" });
  if (!name || name === currentName) return;

  // Renaming onto a category that already exists merges them, which is
  // usually the point: but it's destructive-looking, so it's confirmed.
  const target = categoryMeta.get(name);
  if (target) {
    const ok = await confirmDialog(
      `"${name}" already exists. Merge "${currentName}" into it?\n\n` +
        `Its notes move across, nothing is deleted. "${name}" would then ` +
        `hold ${target.count + meta.count} notes.`,
      { confirmLabel: "Merge", danger: false }
    );
    if (!ok) return;
  }
  //: The notes it holds now, so a merge can be undone note by note.
  const ids = allEntries.filter((e) => e.category === currentName).map((e) => e.id);

  try {
    const result = await apiJson(`/categories/${meta.id}`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    });
    if (activeCategory === currentName) activeCategory = name;
    //: Undoable, and the open panel redrawn (INBOX 432: the panel kept the
    //: old name, and neither a rename nor a merge offered Undo).
    const renameTo = async (from, to) => {
      await loadCategories();
      const row = categoryMeta.get(from);
      if (row) await apiJson(`/categories/${row.id}`, { method: "PUT", body: JSON.stringify({ name: to }) });
    };
    offerCategoryUndo(
      result.merged ? `Merged "${currentName}" into "${name}".` : `Renamed "${currentName}" to "${name}".`,
      () => (result.merged
        ? (ids.length
          ? apiJson("/categories/move", { method: "POST", body: JSON.stringify({ entry_ids: ids, category: currentName }) })
          : apiJson("/categories", { method: "POST", body: JSON.stringify({ name: currentName }) }))
        : renameTo(name, currentName)),
      () => renameTo(currentName, name)
    );
    await refreshAfterCategoryChange();
  } catch (error) {
    toast(error.message, true);
  }
}

//: Kept for the keyboard's Delete on a focused row and older callers; the
//: sidebar's ⋯ now goes through `deleteCategoryFromPanel`, which asks where
//: the notes go.
async function deleteCategory(meta, name, count) {
  const ok = (await confirmDialog(
    `Delete the category "${name}"?\n\n` +
      (count
        ? `Its ${count} note${count === 1 ? "" : "s"} are kept and become ` +
          `Uncategorised: deleting a category never deletes notes.`
        : "It has no notes in it.")
  ));
  if (!ok) return;
  try {
    await apiJson(`/categories/${meta.id}`, { method: "DELETE" });
    if (activeCategory === name) activeCategory = null;
    toast(`Deleted "${name}". Its notes are in Uncategorised.`);
    await loadEntries();
    await loadCategories();
  } catch (error) {
    toast(error.message, true);
  }
}

//: Moves notes back to where they were, from the `previous` a move returned.
async function restoreCategoryMoves(previous) {
  const byCategory = new Map();
  for (const { id, category } of previous) {
    if (!byCategory.has(category)) byCategory.set(category, []);
    byCategory.get(category).push(id);
  }
  for (const [category, ids] of byCategory) {
    await apiJson("/categories/move", { method: "POST", body: JSON.stringify({ entry_ids: ids, category }) });
  }
}

//: **Moving one note is one click on its category** (INBOX 432). Before
//: this, the only ways to change a single note's category were dragging its
//: chip onto the sidebar or opening the whole edit form, and the card's ⋯
//: menu (26 items) had no Move at all: the most common correction a notebook
//: that files for you gets asked for was the hardest one to find. A sheet of
//: every category with its count, the current one marked, and a new one by
//: name; choosing is the move, with the same undo a drop gets.
function chooseNoteCategory(ids, current = "") {
  const noteIds = (Array.isArray(ids) ? ids : [ids]).map(Number).filter(Boolean);
  if (!noteIds.length) return;
  const many = noteIds.length > 1;
  openSheet({
    label: many ? `Move ${noteIds.length} notes to` : "Move to category",
    sub: current && !many ? `Now in ${current}.` : "",
    name: "note-category",
    build: (card, close) => {
      const list = document.createElement("div");
      list.className = "sheet-list";
      const names = [...categoryMeta.keys()].sort((a, b) => a.localeCompare(b));
      for (const name of names) {
        const meta = categoryMeta.get(name);
        const here = name === current;
        const row = sheetRow(here ? "ph ph-check" : "ph ph-folder", `${name} (${meta?.count ?? 0})`, async () => {
          close();
          if (!here) await moveNotesToCategory(noteIds, name);
          //: The redraw took the chip the sheet gave the focus back to.
          if (!many) focusNoteRow(noteIds[0]);
        });
        if (here) row.setAttribute("aria-current", "true");
        list.appendChild(row);
      }
      list.appendChild(
        sheetRow("ph ph-plus", "New category…", async () => {
          close();
          const name = await promptDialog("Name the new category:", "", { confirmLabel: "Move" });
          if (name && name.trim()) await moveNotesToCategory(noteIds, name.trim());
        })
      );
      card.appendChild(list);
    },
  });
}

//: The tag manager (openTagsSheet and the tag edits) moved to tag-manager.js
//: (INBOX 447): it grew past a sheet of rows, and it is its own lazy piece.

//: Moving chosen notes, from the batch bar's Move to or a drop: one call,
//: one toast, one undo.
async function moveNotesToCategory(ids, category) {
  try {
    const result = await apiJson("/categories/move", { method: "POST", body: JSON.stringify({ entry_ids: ids, category }) });
    const previous = result.previous;
    if (previous.length) {
      offerCategoryUndo(
        `Moved ${previous.length} note${previous.length === 1 ? "" : "s"} to "${category}".`,
        () => restoreCategoryMoves(previous),
        () => apiJson("/categories/move", { method: "POST", body: JSON.stringify({ entry_ids: previous.map((p) => p.id), category }) })
      );
    }
    await refreshAfterCategoryChange();
    return result;
  } catch (error) {
    toast(error.message, true);
    return null;
  }
}

//: **The colour picker** (INBOX 441 (4), the owner: "there is no way to
//: customise the colour of categories"). DESIGN.md's swatch picker: a
//: `role="radiogroup"` of round swatches, the twelve hues of `CATEGORY_PALETTE`
//: (notes-list.js; each reads at 3:1 as a dot on both themes) and one worded
//: Automatic that clears the choice. Arrows, Home and End move the focus and
//: the check together (the radio pattern), so the preview above follows the
//: keys; Enter, Space or a click commits, Escape leaves it unchanged. The
//: swatch is painted through the CSSOM (`--swatch`), never an inline style.
const categoryColourName = (key) => (key ? key[0].toUpperCase() + key.slice(1) : "Automatic");

function swatchPicker({ label, value, onChange, onChoose }) {
  const group = document.createElement("div");
  group.className = "swatch-picker";
  group.setAttribute("role", "radiogroup");
  group.setAttribute("aria-label", label);
  const keys = [...Object.keys(CATEGORY_PALETTE), null];
  const radios = keys.map((key) => {
    const radio = document.createElement("button");
    radio.type = "button";
    radio.className = key ? "swatch-option" : "swatch-option swatch-auto";
    radio.setAttribute("role", "radio");
    radio.setAttribute("aria-label", categoryColourName(key));
    radio.title = categoryColourName(key);
    if (key) radio.style.setProperty("--swatch", CATEGORY_PALETTE[key]);
    else radio.textContent = "Automatic";
    radio.addEventListener("click", () => {
      mark(key);
      onChoose(key);
    });
    return radio;
  });
  //: Only the checked swatch is a Tab stop; a stored hex the swatches do not
  //: include leaves none checked, so the first is the stop instead.
  const mark = (key) => {
    radios.forEach((radio, i) => {
      radio.setAttribute("aria-checked", String(keys[i] === key));
      radio.tabIndex = keys[i] === key ? 0 : -1;
    });
    if (!radios.some((radio) => radio.tabIndex === 0)) radios[0].tabIndex = 0;
    onChange?.(key);
  };
  group.addEventListener("keydown", (event) => {
    const at = radios.indexOf(event.target);
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    const to = step ? (at + step + radios.length) % radios.length : { Home: 0, End: radios.length - 1 }[event.key];
    if (at < 0 || to === undefined) return;
    event.preventDefault();
    radios[to].focus();
    mark(keys[to]);
  });
  group.append(...radios);
  mark(keys.includes(value) ? value : undefined);
  return group;
}

async function saveCategoryColour(meta, colour) {
  await apiJson(`/categories/${meta.id}/colour`, { method: "PUT", body: JSON.stringify({ colour }) });
  //: Carries the colour back, and `loadCategories` repaints every dot and
  //: tells the map and the dashboard to redraw.
  await loadCategories();
  manageCategoriesRedraw?.();
}

function pickCategoryColour(meta) {
  const before = categoryMeta.get(meta.name)?.colour || null;
  openSheet({
    label: `Colour for ${meta.name}`,
    sub: "Shown on its dots, labels, graph nodes and timeline. Automatic picks one from its name.",
    name: "category-colour",
    build: (card, close) => {
      card.classList.add("swatch-card");
      const preview = document.createElement("p");
      preview.className = "swatch-preview";
      preview.textContent = meta.name;
      const show = (key) => preview.style.setProperty("--category-dot", key ? CATEGORY_PALETTE[key] || key : categoryAutoDot(meta.name));
      const picker = swatchPicker({
        label: `Colour for ${meta.name}`,
        value: before,
        onChange: show,
        onChoose: async (key) => {
          close();
          if (key === before) return;
          try {
            await saveCategoryColour(meta, key);
          } catch (error) {
            toast(error.message, true);
            return;
          }
          const message = `${meta.name} is now ${categoryColourName(key).toLowerCase()}.`;
          const undo = () => saveCategoryColour(meta, before);
          const action = pushUndo(message, undo, () => saveCategoryColour(meta, key));
          toastAction(message, "Undo", async () => {
            settleUndoFromToast(action);
            await undo();
          });
        },
      });
      card.append(preview, picker);
      requestAnimationFrame(() => picker.querySelector('[tabindex="0"]')?.focus());
    },
  });
}
