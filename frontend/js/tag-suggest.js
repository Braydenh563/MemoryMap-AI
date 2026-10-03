// tag-suggest.js: the tag list under a tags field (INBOX 435), loaded on the
// first focus of one (app.js `LAZY_MODULES.tagSuggest`).
//
// It replaces a native `<datalist>`. The owner, with a screenshot of
// Capture: "the dropdown arrow on the tags row in the capture subtab is not
// aligned vertically and the popup is awkwardly sized". Both were the
// browser's: Chromium draws the arrow and a list of its own size, and takes
// none of the app's styles. This is the rich picker's row (DESIGN.md, "a
// suggest list"), sized to the field and placed under it, and it knows what
// a datalist cannot: the field holds a comma-separated list, so it completes
// the tag being typed after the last comma and leaves out the ones already
// there, and each row says how many notes use the tag.
//
// Keys, the field keeping the focus throughout (a combobox): Down and Up move
// the lit row, Enter or Tab takes it, Escape closes. A press takes a row too.

let tagSuggest = null;

function tagSuggestToken(input) {
  const value = input.value;
  const cut = value.lastIndexOf(",");
  return { head: cut === -1 ? "" : value.slice(0, cut + 1), token: value.slice(cut + 1).trim() };
}

function closeTagSuggest() {
  if (!tagSuggest) return;
  const { input, box, onInput, onKey, onBlur, onWindow } = tagSuggest;
  input.removeEventListener("input", onInput);
  input.removeEventListener("keydown", onKey, true);
  input.removeEventListener("blur", onBlur);
  window.removeEventListener("resize", onWindow);
  window.removeEventListener("scroll", onWindow, true);
  input.setAttribute("aria-expanded", "false");
  input.removeAttribute("aria-activedescendant");
  box.remove();
  tagSuggest = null;
}

function placeTagSuggest() {
  const { input, box } = tagSuggest;
  const field = input.getBoundingClientRect();
  const room = { below: window.innerHeight - field.bottom, above: field.top };
  box.style.left = `${Math.max(8, field.left)}px`;
  box.style.width = `${Math.min(field.width, window.innerWidth - 16)}px`;
  //: Below when it fits, above when the field is near the window's foot
  //: (Capture's tags row usually is), never over the field itself.
  if (room.below >= 180 || room.below >= room.above) {
    box.style.top = `${field.bottom + 4}px`;
    box.style.bottom = "auto";
    box.style.maxHeight = `${Math.max(120, Math.min(280, room.below - 12))}px`;
  } else {
    box.style.top = "auto";
    box.style.bottom = `${window.innerHeight - field.top + 4}px`;
    box.style.maxHeight = `${Math.max(120, Math.min(280, room.above - 12))}px`;
  }
}

function fillTagSuggest() {
  const { input, list, counts } = tagSuggest;
  const { token } = tagSuggestToken(input);
  const have = new Set(input.value.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean));
  const wanted = token.toLowerCase().replace(/^#/, "");
  const names = Object.keys(counts).filter((tag) => {
    const lower = tag.toLowerCase();
    if (have.has(lower) && lower !== wanted) return false;
    return !wanted || lower.includes(wanted);
  });
  //: Starts-with first, then contains, each most used first (the route's
  //: own order).
  names.sort((a, b) => Number(!a.toLowerCase().startsWith(wanted)) - Number(!b.toLowerCase().startsWith(wanted)));
  const rows = names.slice(0, 40).map((tag, i) => {
    const row = richPickerRow({
      icon: "ph:hash",
      label: tag,
      about: `${counts[tag]} note${counts[tag] === 1 ? "" : "s"}`,
      query: wanted,
      id: `tag-suggest-${i}`,
    });
    row.dataset.tag = tag;
    row.addEventListener("pointerdown", (event) => {
      event.preventDefault(); // keep the focus in the field
      takeTagSuggest(tag);
    });
    return row;
  });
  list.replaceChildren(...rows);
  tagSuggest.rows = rows;
  tagSuggest.active = rows.length ? 0 : -1;
  richPickerSetActive(list, rows, tagSuggest.active);
  input.setAttribute("aria-activedescendant", rows.length ? rows[0].id : "");
  tagSuggest.box.classList.toggle("hidden", !rows.length);
  input.setAttribute("aria-expanded", String(rows.length > 0));
  if (rows.length) placeTagSuggest();
}

function takeTagSuggest(tag) {
  const { input } = tagSuggest;
  const { head } = tagSuggestToken(input);
  input.value = `${head}${head ? " " : ""}${tag}, `;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.setSelectionRange(input.value.length, input.value.length);
}

//: The entry point (app.js `LAZY_ENTRY_POINTS.tagSuggest`): opens the list
//: under `input`, or refreshes it when it is already open there.
let tagSuggestOpening = null;

async function openTagSuggest(input) {
  if (tagSuggest && tagSuggest.input === input) return fillTagSuggest();
  //: A press fires focusin and click together: one open at a time, or the
  //: second orphaned the first's list where Escape could not reach it.
  if (tagSuggestOpening === input) return;
  closeTagSuggest();
  tagSuggestOpening = input;
  const counts = await apiJson("/tags", { silent: true, cacheMs: 30000 }).catch(() => null);
  tagSuggestOpening = null;
  if (!counts || !Object.keys(counts).length || document.activeElement !== input || tagSuggest) return;
  const box = document.createElement("div");
  box.className = "tag-suggest card glass hidden";
  const list = document.createElement("ul");
  list.className = "rich-picker-list";
  list.setAttribute("role", "listbox");
  list.id = "tag-suggest-list";
  list.setAttribute("aria-label", "Tags you have used");
  box.appendChild(list);
  document.body.appendChild(box);
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-controls", list.id);
  const onInput = () => tagSuggest && fillTagSuggest();
  const onKey = (event) => {
    const state = tagSuggest;
    if (!state || state.box.classList.contains("hidden")) return;
    const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
    if (step) {
      event.preventDefault();
      state.active = (state.active + step + state.rows.length) % state.rows.length;
      const lit = richPickerSetActive(state.list, state.rows, state.active);
      input.setAttribute("aria-activedescendant", lit?.id || "");
      lit?.scrollIntoView({ block: "nearest" });
    } else if ((event.key === "Enter" || event.key === "Tab") && state.active >= 0 && tagSuggestToken(input).token) {
      //: Enter or Tab takes the lit row only once something is typed, so
      //: Enter on an empty token still does what the field's own Enter does.
      event.preventDefault();
      event.stopPropagation();
      takeTagSuggest(state.rows[state.active].dataset.tag);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeTagSuggest();
    }
  };
  const onBlur = () => closeTagSuggest();
  const onWindow = () => tagSuggest && placeTagSuggest();
  input.addEventListener("input", onInput);
  input.addEventListener("keydown", onKey, true);
  input.addEventListener("blur", onBlur);
  window.addEventListener("resize", onWindow);
  window.addEventListener("scroll", onWindow, true);
  tagSuggest = { input, box, list, counts, rows: [], active: -1, onInput, onKey, onBlur, onWindow };
  fillTagSuggest();
}
