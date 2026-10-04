// note-properties.js: a note's properties and the note types (GRAPH_PLAN
// KG4, INBOX 528).
//
// Lazy, in the suggestions inbox's bundle (app.js, `LAZY_MODULES.inbox`):
// `openNotePropertiesSheet(entry)` from a note's ⋯ (Properties),
// `openNoteTypesSheet()` from the command palette. The properties are the
// `---` block at the top of the note's own text; this sheet is a table over
// it, and Save rewrites only that block (`PUT /entries/{id}/properties`). A
// type's fields come first, each with the control its kind needs; a note
// field is a [[link]], so it is a real link too.

const NOTE_FIELD_KINDS = ["text", "number", "date", "note", "list", "checkbox"];

function propInput(kind, value) {
  const v = Array.isArray(value) ? value : value == null ? [] : [String(value)];
  const input = document.createElement("input");
  input.className = "prop-value";
  if (kind === "checkbox") {
    input.type = "checkbox";
    input.checked = /^(true|yes)$/i.test(v[0] || "");
    return input;
  }
  input.type = kind === "number" ? "number" : kind === "date" ? "date" : "text";
  input.value = kind === "list" ? v.join(", ") : kind === "note" ? (v[0] || "").replace(/^\[\[|\]\]$/g, "") : v[0] || "";
  if (kind === "note") input.setAttribute("list", "prop-note-names");
  if (kind === "list") input.placeholder = "a, b, c";
  return input;
}

function propRead(kind, input) {
  if (kind === "checkbox") return input.checked;
  const text = input.value.trim();
  if (kind === "list") return text.split(",").map((x) => x.trim()).filter(Boolean);
  if (kind === "note") return text ? `[[${text}]]` : "";
  return text;
}

async function openNotePropertiesSheet(entry) {
  const [got, types] = await Promise.all([
    apiJson(`/entries/${entry.id}/properties`).catch(() => null),
    apiJson("/note-types").catch(() => []),
  ]);
  if (!got) {
    toast("Couldn't read this note's properties.", true);
    return;
  }
  const rows = [];
  openSheet({
    label: "Properties",
    sub: "Kept at the top of the note's own text, where any markdown app can read them.",
    name: "note-properties",
    build: (card, close) => {
      card.classList.add("inbox-card");
      const body = document.createElement("div");
      body.className = "inbox-body";
      const names = document.createElement("datalist");
      names.id = "prop-note-names";
      for (const e of (typeof allEntries !== "undefined" ? allEntries : []).slice(0, 300)) {
        const opt = document.createElement("option");
        opt.value = noteSortName(e).split("\n")[0].slice(0, 80);
        names.appendChild(opt);
      }
      //: The type first: a select of the note types; choosing one adds its
      //: fields (empty) to the rows below.
      const typeRow = document.createElement("div");
      typeRow.className = "prop-row";
      const typeLabel = document.createElement("span");
      typeLabel.className = "prop-key muted";
      typeLabel.textContent = "Type";
      const typeSelect = document.createElement("select");
      typeSelect.className = "prop-value";
      typeSelect.setAttribute("aria-label", "Note type");
      for (const [value, label] of [["", "No type"], ...types.map((t) => [t.name, t.name])]) {
        const opt = document.createElement("option");
        opt.value = value;
        opt.textContent = label;
        typeSelect.appendChild(opt);
      }
      if (got.type && !types.some((t) => t.name === got.type)) {
        const opt = document.createElement("option");
        opt.value = got.type;
        opt.textContent = got.type;
        typeSelect.appendChild(opt);
      }
      typeSelect.value = got.type || "";
      typeRow.append(typeLabel, typeSelect);
      const list = document.createElement("div");
      const addRow = (key, kind, value, fixed) => {
        if (rows.some((r) => r.keyValue() === key && key)) return;
        const row = document.createElement("div");
        row.className = "prop-row";
        const keyInput = document.createElement("input");
        keyInput.type = "text";
        keyInput.className = "prop-key";
        keyInput.value = key;
        keyInput.placeholder = "Name";
        keyInput.setAttribute("aria-label", "Property name");
        keyInput.readOnly = Boolean(fixed);
        const input = propInput(kind, value);
        input.setAttribute("aria-label", key ? `Value of ${key}` : "Value");
        const remove = smallButton("ph:x", "Remove this property", () => {
          row.remove();
          rows.splice(rows.indexOf(entryRow), 1);
        });
        remove.classList.add("icon-only");
        const entryRow = { keyValue: () => keyInput.value.trim(), read: () => propRead(kind, input) };
        rows.push(entryRow);
        row.append(keyInput, input, remove);
        list.appendChild(row);
      };
      const fieldsOf = (name) => (types.find((t) => t.name === name)?.fields || []);
      for (const field of fieldsOf(got.type)) addRow(field.name, field.kind, got.properties[field.name], true);
      for (const [key, values] of Object.entries(got.properties || {})) {
        if (key !== "type") addRow(key, values.length > 1 ? "list" : "text", values);
      }
      typeSelect.addEventListener("change", () => {
        for (const field of fieldsOf(typeSelect.value)) addRow(field.name, field.kind, null, true);
      });
      const add = smallButton("ph:plus Add a property", "A new name and value", () => {
        addRow("", "text", null);
        list.lastElementChild?.querySelector(".prop-key")?.focus();
      });
      const actions = document.createElement("div");
      actions.className = "row right space-dialog-actions";
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.className = "ghost";
      cancel.textContent = "Cancel";
      cancel.addEventListener("click", close);
      const save = document.createElement("button");
      save.type = "button";
      save.className = "accent";
      save.textContent = "Save";
      save.addEventListener("click", async () => {
        const properties = {};
        if (typeSelect.value) properties.type = typeSelect.value;
        for (const r of rows) if (r.keyValue()) properties[r.keyValue()] = r.read();
        save.disabled = true;
        const done = await apiJson(`/entries/${entry.id}/properties`, {
          method: "PUT",
          body: JSON.stringify({ properties, base_hash: entry.content_hash || null }),
        }).catch((e) => {
          toast(e.message, true);
          return null;
        });
        save.disabled = false;
        if (!done) return;
        close();
        toast("Properties saved.");
        loadEntries().catch(() => {});
      });
      actions.append(cancel, save);
      body.append(names, typeRow, list, add);
      card.append(body, actions);
    },
  });
}

/** The note types: each with its fields, a New note of that type, and
 *  Delete (its notes keep their properties). */
async function openNoteTypesSheet() {
  const types = await apiJson("/note-types").catch(() => []);
  openSheet({
    label: "Note types",
    sub: "A kind of note with its own fields, written at the top of each new note of that type.",
    name: "note-types",
    build: (card, close) => {
      card.classList.add("inbox-card");
      const list = document.createElement("div");
      list.className = "sheet-list inbox-body";
      for (const t of types) {
        const row = document.createElement("div");
        row.className = "row relation-type-row";
        const name = document.createElement("span");
        name.className = "relation-type-name";
        name.textContent = t.name;
        const fields = document.createElement("span");
        fields.className = "muted relation-type-hint";
        fields.textContent = t.fields.map((f) => `${f.name} (${f.kind})`).join(", ") || "No fields";
        row.append(name, fields, kebabMenu([
          { label: "ph:note-pencil New note of this type", title: `A new note with ${t.name}'s fields at the top`, run: async () => {
            const made = await apiJson("/entries", { method: "POST", body: JSON.stringify({ content: `# New ${t.name.toLowerCase()}`, note_type: t.name, category: "Uncategorised" }) }).catch((e) => {
              toast(e.message, true);
              return null;
            });
            if (!made) return;
            close();
            await loadEntries().catch(() => {});
            await switchTab("notes");
            flashEntry(made.id);
          } },
          { label: "ph:list-plus Fields", title: "Its fields, as name: kind, separated by commas", run: async () => {
            const text = await promptDialog(`Fields, as name: kind, separated by commas. Kinds: ${NOTE_FIELD_KINDS.join(", ")}`, t.fields.map((f) => `${f.name}: ${f.kind}`).join(", "));
            if (text === null || text === undefined) return;
            const ok = await apiJson(`/note-types/${t.id}`, { method: "PATCH", body: JSON.stringify({ fields: noteTypeFieldsParse(text) }) }).catch((e) => {
              toast(e.message, true);
              return null;
            });
            if (!ok) return;
            close();
            openNoteTypesSheet();
          } },
          { label: "ph:trash Delete", title: "Delete this type; its notes keep their properties", group: "delete", run: async () => {
            if (!(await confirmDialog(`Delete the note type “${t.name}”?\n\nIts notes keep every property, type included.`))) return;
            await apiJson(`/note-types/${t.id}`, { method: "DELETE" }).catch((e) => toast(e.message, true));
            close();
            openNoteTypesSheet();
          } },
        ], `Actions for ${t.name}`));
        list.appendChild(row);
      }
      list.appendChild(sheetRow("ph ph-plus", "New note type…", async () => {
        close();
        const name = await promptDialog("Name the note type (for example: Meeting)", "", { confirmLabel: "Next" });
        if (!name || !name.trim()) return;
        const text = await promptDialog(`Its fields, as name: kind, separated by commas (for example: attendees: list, date: date). Kinds: ${NOTE_FIELD_KINDS.join(", ")}`, "", { confirmLabel: "Create" });
        if (text === null || text === undefined) return;
        const made = await apiJson("/note-types", { method: "POST", body: JSON.stringify({ name: name.trim(), fields: noteTypeFieldsParse(text) }) }).catch((e) => {
          toast(e.message, true);
          return null;
        });
        if (made) openNoteTypesSheet();
      }));
      card.appendChild(list);
    },
  });
}

function noteTypeFieldsParse(text) {
  return (text || "").split(",").map((part) => {
    const [name, kind] = part.split(":").map((x) => (x || "").trim());
    return name ? { name, kind: NOTE_FIELD_KINDS.includes((kind || "").toLowerCase()) ? kind.toLowerCase() : "text" } : null;
  }).filter(Boolean);
}
