"""Everything the agent can do, a person can do by hand (INBOX 431 (e)).

The owner: "the user needs to be able to easily do anything the ai can do".
Every write tool the agent has (`WRITE_TOOLS`, plus the category tools, which
write but were never in that set) names the manual way to do the same thing:
the frontend file and a line of it that proves the path exists. A new write
tool with no entry here fails, and so does an entry whose proof has gone
missing from the file, which is how a manual path would silently disappear.

The audit this was written from (2026-09-27): every tool had a manual path
except moving notes between categories as one act, an explicit merge, a split
and a delete that names where the notes go; those are the Manage categories
panel (notes-list.js, `routes_categories.py`).
"""

from __future__ import annotations

from pathlib import Path

from memorymap.ai.tools import WRITE_TOOLS

FRONTEND = Path(__file__).resolve().parents[1] / "frontend"

#: The category tools, in WRITE_TOOLS since round 9 (they were missing, so
#: the agent's claimed-a-save net and the skill list treated them as reads).
CATEGORY_TOOLS = {"create_category", "rename_category", "merge_categories", "delete_category"}

#: tool -> (file, a line that proves the manual path, where a person finds it)
MANUAL = {
    "create_note": ("capture-ask.js", 'apiJson("/entries", {', "Notes, Capture box"),
    "edit_note": ("notes-list.js", "base_hash: base", "a note's Edit form"),
    "tag_note": ("notes-list.js", 'tagsInput.className = "note-edit-tags";', "a note's Edit form, Tags"),
    "pin_note": ("note-cards.js", 'button.classList.add("favourite-btn");', "a note's star"),
    "link_notes": ("graph-canvas.js", 'method: "POST", body: JSON.stringify({ target', "Graph, drag one note to another"),
    "unlink_notes": ("graph.js", '/links/${edge.id}`, { method: "DELETE" })', "Graph, a link's menu, Remove link"),
    "audit_link_reasons": ("note-cards.js", "/reason`", "a note's links, Edit reason"),
    "delete_note": ("note-cards.js", "async function binNoteWithUndo(entry)", "a note's menu, Move to bin"),
    "restore_note": ("note-cards.js", '/restore`, { method: "POST"', "the recycle bin, Restore"),
    "set_reminder": ("shell-reminders.js", 'const created = await apiJson("/reminders", {', "Reminders, New reminder"),
    "complete_reminder": ("shell-reminders.js", "body: JSON.stringify({ done: checkbox.checked }),", "Reminders, the tick box"),
    "rename_tag": ("library.js", 'apiJson("/tags/rename", {', "Library, Tags, Rename"),
    "delete_tag": ("library.js", 'apiJson("/tags/delete", {', "Library, Tags, Delete"),
    "save_skill": ("skills.js", "async function saveSkillList(skills) {", "Settings, Skills, Save"),
    "delete_skill": ("skills.js", "async function saveSkillList(skills) {", "Settings, Skills, Delete"),
    "create_document": ("documents.js", 'apiJson("/documents", {', "Library, Documents, New"),
    "delete_document": ("documents.js", 'apiJson(`/documents/${doc.id}`, { method: "DELETE" });', "a document's menu, Delete"),
    "add_whiteboard_card": ("whiteboard.js", 'apiJson("/whiteboard/nodes", { method: "POST"', "a board, Add card"),
    "add_whiteboard_link": ("whiteboard.js", 'apiJson("/whiteboard/objects", { method: "POST"', "a board, draw a link between cards"),
    "generate_diagram": ("whiteboard.js", 'apiJson("/whiteboard/boards/generate", {', "Boards, Generate a board"),
    "create_mindmap": ("whiteboard.js", 'const board = await apiJson("/whiteboard/boards", {', "Boards, New mind map"),
    "add_map_node": ("whiteboard-map.js", "const created = await apiJson(`/whiteboard/boards/${boardId}/nodes`, {", "a mind map, Add child"),
    "link_map_nodes": ("whiteboard.js", 'apiJson("/whiteboard/objects", { method: "POST"', "a mind map, draw a cross-link"),
    "create_category": ("categories-panel.js", "async function createCategoryFromPanel()", "Manage categories, New category"),
    "rename_category": ("notes-list.js", "async function renameCategory(meta, currentName)", "a category's menu, Rename"),
    "merge_categories": ("categories-panel.js", "async function mergeCategoryFromPanel(meta)", "a category's menu, Merge into"),
    "delete_category": ("categories-panel.js", "async function deleteCategoryFromPanel(meta)", "a category's menu, Delete"),
}


def test_every_write_tool_names_its_manual_path():
    missing = sorted((WRITE_TOOLS | CATEGORY_TOOLS) - set(MANUAL))
    assert not missing, (
        "These agent write tools have no manual path named in tests/test_manual_parity.py. "
        "Add the UI a person uses to do the same, or build it: " + ", ".join(missing)
    )


def test_every_named_manual_path_still_exists():
    gone = []
    for tool, (name, proof, where) in MANUAL.items():
        text = (FRONTEND / name).read_text(encoding="utf-8")
        if proof not in text:
            gone.append(f"{tool}: {where} ({name} no longer has {proof!r})")
    assert not gone, "Manual paths that went missing:\n  " + "\n  ".join(gone)


def test_the_categories_panel_is_reachable_from_the_sidebar_the_menu_and_settings():
    html = (FRONTEND / "index.html").read_text(encoding="utf-8")
    wiring = (FRONTEND / "wiring.js").read_text(encoding="utf-8")
    # The panel moved to its own lazy piece (categories-panel.js).
    notes = "\n".join((FRONTEND / name).read_text(encoding="utf-8") for name in ("notes-list.js", "categories-panel.js"))
    assert 'id="manage-categories-btn"' in html and 'id="settings-manage-categories"' in html
    assert '$("manage-categories-btn").addEventListener("click", () => openManageCategories());' in wiring
    assert '$("settings-manage-categories").addEventListener("click", () => openManageCategories());' in wiring
    assert "kebabMenu(categoryMenuItems(meta), `Actions for ${category}`)" in notes
    assert 'data-help-for", "manage-cat-help"' in notes
    # Every change offers undo.
    assert notes.count("offerCategoryUndo(") >= 5


def test_the_category_tools_count_as_writes():
    assert CATEGORY_TOOLS <= WRITE_TOOLS


def test_the_categories_panel_is_a_managed_list_with_the_reference_head():
    # The owner: "needs some ui redesign ... like the ai assistant panel".
    # The panel moved to its own lazy piece (categories-panel.js).
    notes = "\n".join((FRONTEND / name).read_text(encoding="utf-8") for name in ("notes-list.js", "categories-panel.js"))
    assert 'head.classList.add("dialog-head");' in notes
    assert 'list.setAttribute("role", "listbox");' in notes and 'list.setAttribute("aria-multiselectable", "true");' in notes
    assert "function wireManageCategoryKeys(list, state, redraw)" in notes
    assert "function drawManageCategoryFooter(footer, state, redraw)" in notes
    assert 'filter.placeholder = "Filter categories";' in notes
