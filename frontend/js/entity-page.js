// entity-page.js: a person, place, project, organisation or thing, as a page
// (GRAPH_PLAN KG5, INBOX 528).
//
// Lazy, in the suggestions inbox's bundle (app.js, `LAZY_MODULES.inbox`):
// `openEntityPage(id)` from a graph's entity node and the inbox's Names rows,
// `openEntitiesSheet()` from the command palette. The page is a sheet: where
// the name is said (each note's sentence, the name marked), what it is named
// with, the dates its notes resolve; its ⋯ holds Kind, Rename, Other names and
// Merge into. Every change is the server's (`/entities`), never browser state.

const ENTITY_KIND_WORDS = { person: "Person", place: "Place", project: "Project", organisation: "Organisation", thing: "Thing" };
const ENTITY_KIND_ICONS = { person: "ph-user", place: "ph-map-pin", project: "ph-kanban", organisation: "ph-buildings", thing: "ph-cube" };

function entityIcon(kind) {
  const icon = document.createElement("i");
  icon.className = `ph ${ENTITY_KIND_ICONS[kind] || "ph-at"} ph-lead`;
  icon.setAttribute("aria-hidden", "true");
  return icon;
}

function entityWhen(iso) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "";
}

let entityPageClose = null;

async function openEntityPage(id) {
  const page = await apiJson(`/entities/${id}`).catch((e) => {
    toast(e.message, true);
    return null;
  });
  if (!page) return;
  entityPageClose?.();
  const facts = [ENTITY_KIND_WORDS[page.kind] || "No kind yet", `named in ${page.notes} note${page.notes === 1 ? "" : "s"}`];
  const [first, last] = [entityWhen(page.first_seen), entityWhen(page.last_seen)];
  if (first) facts.push(first === last ? first : `${first} to ${last}`);
  if (page.aliases.length) facts.push(`also ${page.aliases.join(", ")}`);
  entityPageClose = openSheet({
    label: page.name,
    sub: facts.join(" · "),
    name: "entity",
    onClose: () => {
      entityPageClose = null;
    },
    build: (card) => {
      card.classList.add("inbox-card", "entity-card");
      const head = card.querySelector(".sheet-head");
      const actions = document.createElement("span");
      actions.className = "dialog-head-actions";
      const menu = kebabMenu(entityMenuItems(page), `Actions for ${page.name}`);
      menu.querySelector("button")?.classList.add("dialog-head-btn");
      const closeButton = head.querySelector(".sheet-close");
      actions.append(menu, ...(closeButton ? [closeButton] : []));
      head.appendChild(actions);
      const body = document.createElement("div");
      body.className = "inbox-body";
      body.append(entitySection("Mentioned in", page.mentions.map(entityMentionRow), "No visible note names it."));
      const related = document.createElement("div");
      related.className = "row entity-related";
      for (const other of page.related) {
        const b = smallButton(`${other.name} · ${other.notes}`, `Open ${other.name}: named together in ${other.notes} note${other.notes === 1 ? "" : "s"}`, () => openEntityPage(other.id));
        b.prepend(entityIcon(other.kind));
        related.appendChild(b);
      }
      body.append(entitySection("Named with", page.related.length ? [related] : [], "Nothing else is named in its notes."));
      body.append(entitySection("Dates", page.dates.map(entityDateRow), "Its notes name no dates."));
      card.appendChild(body);
    },
  });
}

function entitySection(title, rows, empty) {
  const section = document.createElement("section");
  section.className = "entity-section";
  const h = document.createElement("h3");
  h.className = "entity-section-title";
  h.textContent = title;
  section.appendChild(h);
  if (rows.length) section.append(...rows);
  else {
    const p = document.createElement("p");
    p.className = "muted inbox-empty";
    p.textContent = empty;
    section.appendChild(p);
  }
  return section;
}

function entityMentionRow(m) {
  const row = document.createElement("div");
  row.className = "inbox-row";
  const open = document.createElement("button");
  open.type = "button";
  open.className = "linklike inbox-row-title";
  open.textContent = m.title;
  open.title = "Open this note";
  open.addEventListener("click", () => {
    entityPageClose?.();
    flashEntry(m.id);
  });
  row.append(open, docBacklinkContext(m));
  return row;
}

function entityDateRow(d) {
  const row = document.createElement("p");
  row.className = "entity-date";
  const when = document.createElement("strong");
  when.textContent = entityWhen(d.at);
  const phrase = document.createElement("span");
  phrase.className = "muted";
  phrase.textContent = ` “${d.phrase}”`;
  row.append(when, phrase);
  return row;
}

async function entitySave(page, patch, done) {
  const saved = await apiJson(`/entities/${page.id}`, { method: "PATCH", body: JSON.stringify(patch) }).catch((e) => {
    toast(e.message, true);
    return null;
  });
  if (!saved) return;
  toast(done);
  openEntityPage(page.id);
}

function entityMenuItems(page) {
  return [
    {
      label: "ph:tag Kind",
      items: [...Object.entries(ENTITY_KIND_WORDS), ["", "No kind"]].map(([key, word]) => ({
        label: `${page.kind === key || (!key && !page.kind) ? "ph:check" : "ph:circle"} ${word}`,
        title: `Mark it as ${word.toLowerCase()}`,
        run: () => entitySave(page, { kind: key || null }, key ? `Marked as ${word.toLowerCase()}.` : "Kind cleared."),
      })),
    },
    {
      label: "ph:pencil-simple Rename",
      title: "Change its name; the old one is kept as another name",
      run: async () => {
        const name = await promptDialog("Rename", page.name, { confirmLabel: "Rename" });
        if (!name || !name.trim() || name.trim() === page.name) return;
        entitySave(page, { name: name.trim(), aliases: [...page.aliases, page.name] }, "Renamed.");
      },
    },
    {
      label: "ph:list-plus Other names",
      title: "Names it also goes by, separated by commas; extraction lands them here",
      run: async () => {
        const text = await promptDialog("Other names, separated by commas", page.aliases.join(", "));
        if (text === null || text === undefined) return;
        entitySave(page, { aliases: text.split(",").map((a) => a.trim()).filter(Boolean) }, "Other names saved.");
      },
    },
    {
      label: "ph:arrows-merge Merge into…",
      title: "Fold it into another name: every mention moves",
      run: () => openEntitiesSheet({ mergeFrom: page }),
    },
  ];
}

/** Every entity, most named first, with a filter; or, to merge one, the
 *  list of where it can go. */
async function openEntitiesSheet({ mergeFrom = null } = {}) {
  const rows = await apiJson("/entities").catch(() => []);
  openSheet({
    label: mergeFrom ? `Merge “${mergeFrom.name}” into` : "People and things",
    sub: mergeFrom ? "Every mention moves; its names are kept as other names." : "Named in your notes, most named first.",
    name: "entities",
    build: (card, close) => {
      card.classList.add("inbox-card");
      const filter = document.createElement("input");
      filter.type = "search";
      filter.className = "entity-filter";
      filter.placeholder = "Filter names";
      filter.setAttribute("aria-label", "Filter names");
      const list = document.createElement("div");
      list.className = "sheet-list inbox-body";
      const draw = () => {
        const q = filter.value.trim().toLowerCase();
        list.replaceChildren();
        const shown = rows.filter((r) => (!mergeFrom || r.id !== mergeFrom.id) && (!q || r.name.toLowerCase().includes(q) || r.aliases.some((a) => a.toLowerCase().includes(q))));
        for (const r of shown.slice(0, 200)) {
          const row = sheetRow(`ph ${ENTITY_KIND_ICONS[r.kind] || "ph-at"}`, r.name, async () => {
            if (!mergeFrom) {
              close();
              openEntityPage(r.id);
              return;
            }
            const done = await apiJson(`/entities/${mergeFrom.id}/merge`, { method: "POST", body: JSON.stringify({ into_id: r.id }) }).catch((e) => {
              toast(e.message, true);
              return null;
            });
            if (!done) return;
            close();
            toast(`Merged into “${done.name}”.`);
            openEntityPage(done.kept);
          });
          const count = document.createElement("span");
          count.className = "muted entity-count";
          count.textContent = String(r.notes);
          row.appendChild(count);
          list.appendChild(row);
        }
        if (!shown.length) {
          const p = document.createElement("p");
          p.className = "muted inbox-empty";
          p.textContent = rows.length ? "No name matches." : "No people or things yet. Atlas finds them as it reads your notes.";
          list.appendChild(p);
        }
      };
      filter.addEventListener("input", draw);
      draw();
      card.append(filter, list);
    },
  });
}
