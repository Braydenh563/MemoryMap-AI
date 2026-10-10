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
    "edit_note": ("note-edit-panels.js", "base_hash: base", "a note's Edit form"),
    "tag_note": ("note-edit-panels.js", 'tagField.className = "tag-field note-edit-tags";', "a note's Edit form, Tags"),
    "pin_note": ("note-cards.js", 'button.classList.add("favourite-btn");', "a note's star"),
    "link_notes": ("graph-canvas.js", 'method: "POST", body: JSON.stringify({ target', "Graph, drag one note to another"),
    "unlink_notes": ("graph.js", '/links/${edge.id}`, { method: "DELETE" })', "Graph, click a link, Remove"),
    "audit_link_reasons": ("note-cards.js", "/reason`", "a note's links, Edit reason"),
    "delete_note": ("note-cards.js", "async function binNoteWithUndo(entry)", "a note's menu, Move to bin"),
    "restore_note": ("note-cards.js", '/restore`, { method: "POST"', "the recycle bin, Restore"),
    "set_reminder": ("shell-reminders.js", 'async function addReminder(text, dueValue', "Reminders, New reminder"),
    "complete_reminder": ("shell-reminders.js", "before, { done: checkbox.checked });", "Reminders, the tick box"),
    "rename_tag": ("tag-manager.js", '"/tags/rename",', "Manage tags, Rename"),
    "delete_tag": ("tag-manager.js", '"/tags/delete", { names }', "Manage tags, Remove from all notes"),
    "save_skill": ("skills.js", "async function saveSkillList(skills) {", "Settings, Skills, Save"),
    "delete_skill": ("skills.js", "async function saveSkillList(skills) {", "Settings, Skills, Delete"),
    "create_document": ("documents.js", 'apiJson("/documents", {', "Library, Documents, New"),
    "delete_document": ("documents.js", 'apiJson(`/documents/${doc.id}`, { method: "DELETE" });', "a document's menu, Delete"),
    "add_whiteboard_card": ("whiteboard.js", 'apiJson("/whiteboard/nodes", { method: "POST"', "a board, drag a note in from the sidebar's Notes tab"),
    "add_whiteboard_link": ("whiteboard.js", 'apiJson("/whiteboard/objects", { method: "POST"', "a board, draw a link between cards"),
    "generate_diagram": ("whiteboard.js", 'apiJson("/whiteboard/boards/generate", {', "Library, Boards & maps, Map from notes"),
    "create_mindmap": ("whiteboard.js", 'const board = await apiJson("/whiteboard/boards", {', "Library, Boards & maps, New, Mind map"),
    "add_map_node": ("whiteboard-map.js", "const created = await apiJson(`/whiteboard/boards/${boardId}/nodes`, {", "a mind map, Add child"),
    "link_map_nodes": ("whiteboard.js", 'apiJson("/whiteboard/objects", { method: "POST"', "a mind map, draw a cross-link"),
    "move_board_item": ("whiteboard-format.js", "async function wbFmtGeometry(axis, value)", "a board, drag an item, or the Format panel's X and Y"),
    "edit_board_item": ("whiteboard-format.js", 'on("wb-fmt-stroke", "change"', "a board, the context bar or the Format panel"),
    "delete_board_item": ("whiteboard.js", "function deleteWbSelection()", "a board, select an item, Delete"),
    "restore_board_item": ("whiteboard.js", "async function wbUndo()", "a board, Undo (Ctrl+Z)"),
    "add_board_shape": ("whiteboard-library.js", "async function wbLibPlace(entry, at = null", "a board, the Library's shapes and frames"),
    "place_library_item": ("whiteboard-library.js", "async function wbLibPlace(entry, at = null", "a board, the Library, click or drag a tile"),
    "create_category": ("categories-panel.js", "async function createCategoryFromPanel()", "Manage categories, New category"),
    "rename_category": ("categories-panel.js", "async function renameCategory(meta, currentName)", "a category's menu, Rename"),
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
        text = (FRONTEND / "js" / name).read_text(encoding="utf-8")
        if proof not in text:
            gone.append(f"{tool}: {where} ({name} no longer has {proof!r})")
    assert not gone, "Manual paths that went missing:\n  " + "\n  ".join(gone)


def test_the_categories_panel_is_reachable_from_the_sidebar_the_menu_and_settings():
    html = (FRONTEND / "index.html").read_text(encoding="utf-8")
    #: The Settings button's listener is in settings-controls.js now.
    wiring = "\n".join((FRONTEND / "js" / name).read_text(encoding="utf-8") for name in ("wiring.js", "settings-controls.js"))
    # The panel moved to its own lazy piece (categories-panel.js).
    notes = "\n".join((FRONTEND / "js" / name).read_text(encoding="utf-8") for name in ("notes-list.js", "categories-panel.js"))
    assert 'id="manage-categories-btn"' in html and 'id="settings-manage-categories"' in html
    assert '$("manage-categories-btn").addEventListener("click", () => openManageCategories());' in wiring
    assert '$("settings-manage-categories").addEventListener("click", () => openManageCategories());' in wiring
    assert "kebabMenu(categoryMenuItems(meta), `Actions for ${category}`, { vertical: true })" in notes
    assert 'data-help-for", "manage-cat-help"' in notes
    # Every change offers undo.
    assert notes.count("offerCategoryUndo(") >= 5


def test_the_category_tools_count_as_writes():
    assert CATEGORY_TOOLS <= WRITE_TOOLS


def test_the_categories_panel_is_a_managed_list_with_the_reference_head():
    # The owner: "needs some ui redesign ... like the ai assistant panel".
    # The panel moved to its own lazy piece (categories-panel.js).
    notes = "\n".join((FRONTEND / "js" / name).read_text(encoding="utf-8") for name in ("notes-list.js", "categories-panel.js"))
    assert 'head.classList.add("dialog-head");' in notes
    # A grid since INBOX 433 (an option may not hold its ⋯; a grid cell may).
    assert 'list.setAttribute("role", "grid");' in notes and 'list.setAttribute("aria-multiselectable", "true");' in notes
    assert "function wireManageCategoryKeys(list, state, redraw)" in notes
    assert "function drawManageCategoryFooter(footer, state, redraw)" in notes
    assert 'filter.placeholder = "Filter categories";' in notes


#: The person's small tools (UI_MODERNISATION utilities row 5, Brief 89):
#: utility -> (file, a line that proves it, where a person finds it, its
#: Guide topic). Each has a way in, a line of help where it is offered, and
#: a Guide topic that says how to use it.
UTILITIES = {
    "statistics": ("statistics.js", 'helpBody.id = "stats-help";', "the heatmap's Statistics, the palette's Statistics", "statistics"),
    "timer": ("utility-tools.js", "function startUtilityTimer(minutes = 25)", "the palette's Start a timer, or timer 10 minutes", "timer"),
    "stopwatch": ("utility-tools.js", "function startStopwatch()", "the palette's Start a stopwatch", "timer"),
    "stop the clock": ("utility-tools.js", '$("status-timer").addEventListener("click", stopUtilityClock);', "the status bar's timer chip", "timer"),
    "count words": ("utility-tools.js", "function countSelection(caught)", "the palette's Count words", "count-words"),
    "live captions": ("captions.js", "function startLiveCaptions()", "the palette's Live captions", "live-captions"),
    "insert template": ("app-palette.js", "label: `ph:note-blank Insert template: ${template.name}`,", "the palette's insert template", "insert-template"),
}


def test_every_utility_has_its_way_in_and_a_guide_topic():
    from memorymap.ai import help_chat

    topics = {topic["id"] for topic in help_chat.HELP_TOPICS}
    gone = [
        f"{name}: {where}"
        for name, (file, proof, where, topic) in UTILITIES.items()
        if proof not in (FRONTEND / "js" / file).read_text(encoding="utf-8") or topic not in topics
    ]
    assert not gone, "Small tools that lost their way in or their Guide topic:\n  " + "\n  ".join(gone)
    #: Each palette row carries its one line of help (`about`), the palette's
    #: in-place help; the Statistics page and Settings, Templates also have a
    #: '?' popover (`data-help-for`).
    panes = (FRONTEND / "js" / "settings-panes.js").read_text(encoding="utf-8")
    for label in ("Statistics", "Start a timer", "Start a stopwatch", "Count words", "Live captions"):
        row = next((line for line in panes.splitlines() if 'label: "ph:' in line and f' {label}"' in line), "")
        assert "about:" in row, f"the palette's {label} row has no line of help"
    html = (FRONTEND / "index.html").read_text(encoding="utf-8")
    assert 'data-help-for="templates-help"' in html and "insert template" in html.split('id="templates-help"', 1)[1][:1200]
