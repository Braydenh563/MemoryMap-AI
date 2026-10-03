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
//: New category. The categories are a listbox of quiet rows (the colour dot,
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
      list.setAttribute("role", "listbox");
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
          list.querySelector('[role="option"]')?.focus();
        }
      });
      wireManageCategoryKeys(list, state, redraw);
      redraw();
      //: After the sheet's own first-button focus, which would land on the '?'.
      const start = focusName ? list.querySelector(`[data-category="${CSS.escape(focusName)}"]`) : null;
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
  const hadFocus = list.contains(document.activeElement) ? document.activeElement.dataset.category : null;
  list.replaceChildren();
  const shown = [...categoryMeta.values()].filter((meta) => !state.filter || meta.name.toLowerCase().includes(state.filter));
  for (const name of [...state.selected]) if (!categoryMeta.has(name)) state.selected.delete(name);
  if (!shown.length) {
    const none = document.createElement("li");
    none.className = "muted manage-cat-empty";
    none.textContent = state.filter ? "No category matches that." : "No categories yet.";
    list.appendChild(none);
  }
  const current = shown.some((meta) => meta.name === (hadFocus || state.active)) ? (hadFocus || state.active) : shown[0]?.name;
  for (const meta of shown) {
    const li = document.createElement("li");
    li.className = "manage-cat-row";
    li.dataset.category = meta.name;
    li.setAttribute("role", "option");
    li.setAttribute("aria-selected", String(state.selected.has(meta.name)));
    li.tabIndex = meta.name === current ? 0 : -1;
    const dot = document.createElement("span");
    dot.className = "manage-cat-dot";
    dot.style.setProperty("--category-dot", categoryDotColour(meta.name));
    dot.setAttribute("aria-hidden", "true");
    const name = document.createElement("span");
    name.className = "manage-cat-name";
    name.textContent = meta.name;
    name.title = meta.name;
    const count = document.createElement("span");
    count.className = "manage-cat-count";
    count.textContent = String(meta.count);
    count.title = `${meta.count} note${meta.count === 1 ? "" : "s"}`;
    li.setAttribute("aria-label", `${meta.name}, ${meta.count} note${meta.count === 1 ? "" : "s"}`);
    li.append(dot, name, count);
    if (meta.name !== "Uncategorised") {
      const menu = kebabMenu(categoryMenuItems(meta, { inPanel: true }), `Actions for ${meta.name}`);
      menu.classList.add("manage-cat-menu");
      menu.addEventListener("click", (event) => event.stopPropagation());
      menu.addEventListener("keydown", (event) => event.stopPropagation());
      li.appendChild(menu);
    } else {
      const spacer = document.createElement("span");
      spacer.className = "manage-cat-spacer";
      spacer.setAttribute("aria-hidden", "true");
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
      list.querySelector(`[data-category="${CSS.escape(meta.name)}"]`)?.focus();
    });
    li.addEventListener("dblclick", () => showCategoryNotes(meta.name));
    list.appendChild(li);
  }
  if (hadFocus) list.querySelector(`[data-category="${CSS.escape(hadFocus)}"]`)?.focus();
  drawManageCategoryFooter(footer, state, () => drawManageCategoryRows(list, footer, state));
}

function showCategoryNotes(name) {
  activeCategory = name;
  draftsOnly = false;
  favouritesOnly = false;
  showNotesSection("browse");
  renderSidebar();
  renderEntries();
}

//: The listbox's keys, on the list so they survive every redraw.
function wireManageCategoryKeys(list, state, redraw) {
  list.addEventListener("keydown", (event) => {
    const row = event.target.closest?.('[role="option"]');
    if (!row) return;
    const rows = [...list.querySelectorAll('[role="option"]')];
    const at = rows.indexOf(row);
    const move = (to) => {
      const next = rows[Math.max(0, Math.min(rows.length - 1, to))];
      if (!next) return;
      rows.forEach((r) => { r.tabIndex = r === next ? 0 : -1; });
      state.active = next.dataset.category;
      next.focus();
      next.scrollIntoView({ block: "nearest" });
    };
    const meta = categoryMeta.get(row.dataset.category);
    if (event.key === "ArrowDown") move(at + 1);
    else if (event.key === "ArrowUp") move(at - 1);
    else if (event.key === "Home") move(0);
    else if (event.key === "End") move(rows.length - 1);
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
        for (const meta of categoryMeta.values()) {
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
