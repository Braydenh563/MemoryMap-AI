// quick-access.js: arranging the dashboard's Quick access row (INBOX 461).
//
// Lazy (app.js, `LAZY_MODULES.quickAccess`): the row itself, the stored list
// and the Customise and Reset menu are dashboard.js; this is the editing view
// and the picker, which only a person who customises ever needs. Entered
// through `quickAccessEdit`, a `LAZY_ENTRY_POINTS` stand-in, from
// `renderQuickLinks` while `quickEditing` is set.
//
// The view is the row itself with a ⋯ menu beside each tile (Move left, Move
// right, Remove: the keyboard's route to reordering, which is also what a
// phone uses) and the tiles draggable on a pointer, using the dashboard
// widgets' own `dashDragOverCard`. A tile's own press is switched off while
// editing: a tile that opens a feature when you meant to arrange it is the
// mistake this mode exists to avoid.
//
// Adding is the rich picker (rich-picker.js): every command the palette has
// that declares a place to go and says a line about itself, minus what is
// already a tile.

function quickAccessLeave() {
  quickEditing = false;
  renderQuickLinks();
}

//: Save, redraw, and put the focus back on the control that was used: the
//: redraw replaces every node, and a keyboard user who moved a tile would
//: otherwise land on the page's top.
async function quickAccessCommit(ids, focusId = "") {
  await saveQuickAccess(ids);
  await quickAccessEdit();
  const spot = focusId && $("dash-quicklinks")?.querySelector(`[data-id="${CSS.escape(focusId)}"] .menu-wrap button`);
  (spot || $("dash-quicklinks")?.querySelector(".quick-edit-add"))?.focus();
}

function quickAccessTile(link, index, ids, row) {
  const wrap = document.createElement("div");
  wrap.className = "quick-edit-tile";
  wrap.dataset.id = link.id;
  wrap.draggable = true;
  const tile = quickLinkButton({ ...link, run: () => {} });
  tile.tabIndex = -1;
  tile.setAttribute("aria-disabled", "true");
  const move = (by) => {
    const next = [...ids];
    const [taken] = next.splice(index, 1);
    next.splice(index + by, 0, taken);
    return quickAccessCommit(next, link.id);
  };
  const menu = kebabMenu(
    [
      { label: "ph:arrow-left Move left", title: `Move ${link.label} one place left`, disabled: index === 0, run: () => index > 0 && move(-1) },
      { label: "ph:arrow-right Move right", title: `Move ${link.label} one place right`, disabled: index === ids.length - 1, run: () => index < ids.length - 1 && move(1) },
      { label: "ph:trash Remove", title: `Take ${link.label} off this row`, group: "remove", disabled: ids.length < 2, run: () => ids.length > 1 && quickAccessCommit(ids.filter((id) => id !== link.id)) },
    ],
    `${link.label}: arrange`,
  );
  wrap.append(tile, menu);
  wrap.addEventListener("dragstart", () => wrap.classList.add("dragging"));
  wrap.addEventListener("dragend", () => {
    wrap.classList.remove("dragging");
    const order = [...row.querySelectorAll(".quick-edit-tile")].map((el) => el.dataset.id);
    if (order.join() !== ids.join()) quickAccessCommit(order, link.id);
  });
  wrap.addEventListener("dragover", (event) => {
    event.preventDefault();
    const dragged = row.querySelector(".dragging");
    if (dragged && dragged !== wrap) dashDragOverCard(event, wrap, dragged, row);
  });
  return wrap;
}

async function quickAccessEdit() {
  const box = $("dash-quicklinks");
  if (!box) return;
  const items = quickAccessCurrent();
  const ids = items.map((link) => link.id);
  const heading = document.createElement("p");
  heading.className = "launch-label";
  heading.textContent = "Quick access";
  const count = document.createElement("span");
  count.className = "muted launch-count";
  count.textContent = `${ids.length} of ${QUICK_ACCESS_MAX}`;
  const done = smallButton("ph:check Done", "Finish arranging", quickAccessLeave);
  done.classList.add("launch-done");
  const head = document.createElement("div");
  head.className = "launch-head";
  head.append(heading, count, done);

  const row = document.createElement("div");
  row.className = "launch-row launch-row-start quick-edit-row";
  items.forEach((link, index) => row.appendChild(quickAccessTile(link, index, ids, row)));
  if (ids.length < QUICK_ACCESS_MAX) {
    const add = quickLinkButton({ icon: "ph:plus", label: "Add an action", hint: "Pick from every command", run: () => quickAccessPick(ids) });
    add.classList.add("quick-edit-add");
    row.appendChild(add);
  }
  const group = document.createElement("div");
  group.className = "launch-group";
  group.append(head, row);
  box.replaceChildren(group);
}

//: The picker: a search box over the rich picker's rows, a button each, walked
//: by Tab like the Library's Create picker. Rows already on the row are left
//: out, by key and by name, so New note is not offered beside New note.
function quickAccessPick(ids) {
  const have = new Set(quickAccessCurrent().map((link) => link.label.toLowerCase()));
  const options = [...quickCatalogue().values()].filter((link) => !ids.includes(link.id) && !have.has(link.label.toLowerCase()));
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay confirm-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Add to Quick access");
  const card = document.createElement("div");
  card.className = "card modal-card space-dialog library-create-picker quick-pick";
  const head = document.createElement("div");
  head.className = "dialog-head";
  const title = document.createElement("h2");
  title.className = "dialog-head-title";
  title.textContent = "Add to Quick access";
  const actions = document.createElement("span");
  actions.className = "dialog-head-actions";
  const returnFocus = document.activeElement;
  const close = () => {
    document.removeEventListener("keydown", onKey, true);
    overlay.remove();
    returnFocus?.isConnected && returnFocus.focus?.();
  };
  const onKey = (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
    }
  };
  const x = smallButton("ph:x", "Close", close);
  x.classList.add("icon-only", "dialog-head-btn");
  actions.appendChild(x);
  head.append(title, actions);
  const search = document.createElement("input");
  search.type = "search";
  search.className = "quick-pick-search";
  search.placeholder = "Search commands";
  search.setAttribute("aria-label", "Search commands");
  const list = document.createElement("ul");
  list.className = "rich-picker-list library-create-list quick-pick-list";
  list.setAttribute("role", "list");
  const draw = () => {
    const needle = search.value.trim().toLowerCase();
    list.replaceChildren();
    for (const link of options) {
      if (needle && !`${link.label} ${link.hint}`.toLowerCase().includes(needle)) continue;
      const li = document.createElement("li");
      const button = richPickerRow({ tag: "button", role: null, icon: link.icon, label: link.label, about: link.hint, query: needle });
      button.addEventListener("click", () => {
        close();
        quickAccessCommit([...ids, link.id], link.id);
      });
      li.appendChild(button);
      list.appendChild(li);
    }
    if (!list.children.length) {
      const none = document.createElement("li");
      none.className = "muted quick-pick-empty";
      none.textContent = "No command matches that.";
      list.appendChild(none);
    }
  };
  search.addEventListener("input", draw);
  draw();
  card.append(head, search, list);
  overlay.appendChild(card);
  wireBackdropClose(overlay, close);
  document.addEventListener("keydown", onKey, true);
  document.body.appendChild(overlay);
  search.focus();
}
