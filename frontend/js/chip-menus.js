// Lazily loaded (LAZY_MODULES.chipMenus in app.js): the small menus a note
// card's category chip and tag chips open (INBOX 447), so they stay off the
// boot scripts' gzip budget (tests/test_static_compression.py). The chip's
// press is boot code (note-cards.js); the menu is built here, on first use.
//
//: Both are the menu-at-the-pointer recipe (`openMenuAtPoint`, DESIGN.md's
//: "A menu at the pointer"), which is `kebabMenu` anchored where the press
//: was, or under the chip when a key opened it. Escape gives the focus back
//: to the chip: the menu's own anchor is a transparent pixel, which is
//: nowhere a keyboard user can carry on from.

let chipMenuReturn = null;

document.addEventListener(
  "keydown",
  (event) => {
    if (event.key !== "Escape" || !chipMenuReturn) return;
    const { menu, chip: chipEl } = chipMenuReturn;
    if (!menu.contains(event.target)) return;
    chipMenuReturn = null;
    setTimeout(() => {
      if (chipEl.isConnected) chipEl.focus({ preventScroll: true });
    });
  },
  true
);

function openChipMenu(chipEl, items, ariaLabel, x, y) {
  const box = chipEl.getBoundingClientRect();
  openMenuAtPoint(items, ariaLabel, x ?? box.left, y ?? box.bottom + 4);
  const menu = document.querySelector(".action-menu:not(.hidden)");
  chipMenuReturn = menu ? { menu, chip: chipEl } : null;
}

//: The category chip (INBOX 447 (5)): look at the category, move this note,
//: or manage categories. A click used to jump straight to Move.
function openCategoryChipMenu(chipEl, entry) {
  const name = entry.category;
  openChipMenu(
    chipEl,
    [
      { label: `ph:eye Show notes in ${name}`, title: `Show only the notes in ${name}`, run: () => showCategoryNotes(name, { clearSearch: true }) },
      { label: "ph:folder-open Move to another category…", title: "Move this note to a different category", run: () => chooseNoteCategory([entry.id], name) },
      { label: "ph:sliders-horizontal Manage categories…", title: "Rename, merge, split or delete categories", group: "all", run: () => openManageCategories(name) },
    ],
    `Category ${name}`
  );
}

//: A tag chip (INBOX 447 (4)): right-click, or the menu key. `x` and `y` are
//: the pointer when there was one.
function openTagChipMenu(chipEl, entry, tag, x, y) {
  openChipMenu(
    chipEl,
    [
      { label: "ph:eye Show notes", title: `Show every note tagged #${tag}`, run: () => filterNotesByTag(tag) },
      { label: "ph:pencil-simple Rename in all notes…", title: `Rename #${tag} on every note that has it`, run: () => renameTagEverywhere(tag) },
      { label: "ph:x Remove from this note", title: `Take #${tag} off this note only`, run: () => removeTagFromNote(entry, tag) },
      { label: "ph:hash Manage tags…", title: "Rename, merge or remove tags across every note", group: "all", run: () => openTagsSheet(tag) },
    ],
    `Tag ${tag}`,
    x,
    y
  );
}
