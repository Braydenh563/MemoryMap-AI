"""The owner's 2026-10-10 list, chat and first-run items (agent chatui-1010).

Each test names the owner's words and what was measured in the running app;
the suite cannot open a browser, so these hold the shapes as text.
"""

from __future__ import annotations

from pathlib import Path

from tests._app_js import frontend_text

ROOT = Path(__file__).resolve().parent.parent


def test_a_finished_runs_bar_goes():
    """"says done but the bar is still there??" (the Agent activity row
    "Installing 1 package", Done, with its bar at 1 of 1). Measured: a run at
    60% shows its bar; after `endAgentRun` the bar is hidden and the detail
    line stays."""
    js = frontend_text("agent-activity.js")
    assert 'const bar = run.state === "running" && fraction !== null;' in js
    assert 'run.bar.classList.toggle("hidden", !bar);' in js


def test_the_companion_menu_opens_in_the_enlarged_view():
    """"I cant right click to view the menu to change the companion in the
    expanded popup view". Measured: right-click in the enlarged view opens
    the menu on top (z 2601 over the card) with Companion, Atlas look and
    Size only; choosing a persona there switches it and the card stays open."""
    avatars = frontend_text("avatars.js")
    handler = avatars[avatars.index('face.addEventListener("contextmenu"') :][:600]
    assert "if (nmb.visit) return;" not in handler
    menu = frontend_text("companion-menu.js")
    assert 'nmb.visit ? items.filter((item) => item.group === "who") : items' in menu


def test_a_slash_row_that_opens_a_picker_waits_for_the_press_to_end():
    """"I tried to press a note on the slash menu in the chat tab and the
    panel flickered then nothing happened". Reproduced with a press held
    250 ms: the picker opened before mouseup and the press's own click closed
    it (8 of 8 samples hidden). After: open in all 8 for a held press, a fast
    click and Enter, for A note and A document."""
    editor = frontend_text("editor.js")
    assert "editorMenuState.pressing = true;" in editor and "editorMenuState.pressing = false;" in editor
    commands = editor[editor.index("function chatCommands() {") :][:3000]
    assert 'document.addEventListener("mouseup", () => setTimeout(fn), { once: true, capture: true });' in commands
    assert "const pick = (source) => afterPress(" in commands
    assert "const press = (id) => afterPress(" in commands


def test_the_ask_again_row_has_its_menu():
    """"There's no way to clear your ask history" (the Ask again chips).
    Measured: the row's ⋯ (28 px, on the chips' line) lists Forget per
    question and Clear question history; Forget drops one chip, Clear hides
    the row. Backend: tests/test_recent_questions_surface.py."""
    assert 'ensureModule("askHistory").then(() => askAgainMenu(box, questions));' in frontend_text("status.js")
    ask = frontend_text("ask-history.js")
    assert "function askAgainMenu(box, questions)" in ask
    assert 'box.appendChild(kebabMenu(items, "Ask again options"));' in ask
    clear = ask[ask.index("async function clearAskHistory()") :][:600]
    assert "loadRecentQuestions();" in clear


def test_the_places_list_can_lose_a_row_or_be_cleared():
    """"no way to clear the destination history or delete individual
    records??". Measured on six visits: the X (28 px, shown on hover) took
    Library off (5 left, current kept), Back then walked the edited stack to
    Timeline, and Clear this list left only where you are (Back disabled)."""
    nav = frontend_text("nav-history.js")
    assert "function navHistoryForget(group, event)" in nav and "function navHistoryClear(event)" in nav
    assert "tabHistory.edited = true;" in nav
    assert "tabHistory.edited ||" in frontend_text("router.js")


def test_a_board_in_the_results_is_drawn_and_opened_as_a_board():
    """"a whitebaord showed as a note in the notes ask subtab matching records
    column" (INBOX 744 (a): "clicking it takes me to the notes page").
    Measured: asking "zebra crossing" listed the board as "zebra crossing
    board, Board" (title "Open it"), Sources read "1 board", and pressing it
    opened #/library/board/3. Backend: test_library_boards.py."""
    cards = frontend_text("note-cards.js")
    assert '"ph:tree-structure Mind map" : "ph:pencil-circle Board"' in cards
    ask = frontend_text("capture-ask.js")
    assert "entry.board_kind ? () => openWhiteboardBoard(entry.id) : () => flashEntry(entry.id)" in ask
    agent = frontend_text("chat-agent.js")
    assert 'kind: board === "map" ? "map" : board ? "board" : "note",' in agent
    assert '{ key: "board", icon: "ph:pencil-circle", one: "board", many: "boards" },' in agent


def test_the_ask_wait_is_on_screen():
    """INBOX 727: "there's no searching animation or indicator for when I
    enter a search in the ask tab and nothing has shown yet". Measured with
    the stream held 2.5 s: before, the phase line sat in the hidden results
    grid (0x0) for the whole wait; after, the line is 26 px tall at once and
    the records column reads "Searching your notes…" (532x43)."""
    ask = frontend_text("capture-ask.js")
    body = ask[ask.index("async function askQuestion(") :][:9000]
    assert 'setLabel(searching, "ph:spin Searching your notes…");' in body
    assert body.index('$("chat-results").classList.remove("hidden");') < body.index("await streamChat(")


def test_a_percentage_on_every_card_or_none():
    """INBOX 728: "how come only some of the ask tab matching records notes
    green arrows have % number similarity and others dont show a number??"
    Measured with three rows: all scored, 68%, 90%, 50% similar; one row
    without a score, the scored chip reads "Similar" (the number in its
    title) and no card shows a number."""
    ask = frontend_text("capture-ask.js")
    assert "function everyRowScored(rows, info, connected)" in ask
    assert 'scored ? text : text.replace(/\\d+% similar/, "Similar")' in ask
    for name in ("capture-ask.js", "chat-agent.js", "ask-history.js"):
        assert "matchReasonBadge(matchInfo[entry.id], scored)" in frontend_text(name), name


def test_a_reply_says_who_wrote_it_and_a_composed_one_arrives():
    """"Composer chat messages ... should say if the composer or a specific
    ai model generated it"; "Composer responses just appear, I think there
    should be an animation". Measured: the head reads "Atlas, from your
    notes" (it read "Atlas"); a two-block composed answer's blocks rise with
    delays 0 and 60 ms; reduced motion skips it."""
    attach = frontend_text("chat-attach.js")
    assert 'const by = meta?.composed ? "from your notes" : stats?.model || meta?.answered_by;' in attach
    assert "who.textContent = `${bubble.dataset.persona}, ${by}`;" in attach
    assert "if (meta?.composed && !reducedMotionWanted()) {" in attach
    assert '"ph:notebook Your notes, no AI"' not in attach


def test_web_pieces_of_the_owners_list():
    """Web sources first ("1 web page · 2 notes", kinds web, note, note);
    "a retry button for failed web searches" (Try again, 32 px, beside the
    error); "I saved a website as a bookmark but the icon didnt change"
    (pressed: `active`, aria-pressed true, title "In your bookmarks");
    "the notification said it takes a while to pull the first image for
    searxng but ive already used multiple times" (said only when absent)."""
    agent = frontend_text("chat-agent.js")
    assert 'return [...sources.filter((s) => s.kind === "web"), ...sources.filter((s) => s.kind !== "web")];' in agent
    groups = agent[agent.index("const CHAT_SOURCE_GROUPS = [") :][:200]
    assert groups.index('key: "web"') < groups.index('key: "note"')
    chat = frontend_text("chat.js")
    assert 'smallButton("ph:arrow-clockwise Try again", "Search again", () => runWebSearch())' in chat
    assert 'webEngineInfo?.state === "absent" ? "Setting SearXNG up…' in chat
    assert "the first run pulls the image" not in chat + frontend_text("settings-controls.js")
    clip = frontend_text("web-clip.js")
    assert "function readerBookmark()" in clip and 'button.classList.toggle("active", kept);' in clip


def test_a_follow_up_about_the_page_carries_the_page():
    """"I tried to ask for more info from the retrieved website in the
    previous prompt and it just straight up ignored me". A turn kept only its
    question and answer, so the page's text was gone. Measured on the running
    app with the page routed: "tell me more about that page" was sent with
    the page's text; "what is on my shopping list" was not; the bubble shows
    only what was typed. The rule, run in node over the shipped regex:"""
    import json
    import re
    import shutil
    import subprocess

    import pytest

    if not shutil.which("node"):
        pytest.skip("needs node")
    clip = frontend_text("web-clip.js")
    rule = re.search(r"^const WEB_FOLLOW_UP = (/.*/i);$", clip, re.M).group(1)
    asks = {
        "tell me more about that page": True,
        "can you give more info from the website": True,
        "what else does the article say": True,
        "more details please": True,
        "what does it say about stripes on it": True,
        "what is on my shopping list": False,
        "summarise my notes about zebras": False,
    }
    script = f"const r = {rule}; console.log(JSON.stringify({json.dumps(list(asks))}.map((q) => r.test(q))));"
    got = json.loads(subprocess.run(["node", "-e", script], capture_output=True, text=True, check=True).stdout)
    assert dict(zip(asks, got)) == asks
    attach = frontend_text("chat-attach.js")
    assert "const page = await webFollowUp(typed, chatLastWebUrl);" in attach
    assert 'chatLastWebUrl = turnSources.find((source) => source.kind === "web" && source.url)?.url || null;' in attach


def test_a_result_card_keeps_its_reason_and_ends_with_its_date():
    """INBOX 745 (a): "note dates arent in the corner like i asked"; INBOX 728
    again: in Ask's records the reason chip was folded to its icon (24 px,
    words display:none) on cards whose facts line ran out of room, so some
    cards showed a number and some only the mark. Measured after: the chip
    keeps its words (144 px, "73% similar · “garden”"; the links count folds
    to its icon first) and the date ends the line at the right edge (1292 to
    1348 of a 888 to 1364 line; 107 px from the card's right before)."""
    cards = frontend_text("note-cards.js")
    assert 'text.parentElement.matches(".review, .result-reason-chip")' in cards
    ask = frontend_text("capture-ask.js")
    assert 'meta.insertBefore(badge, meta.querySelector(":scope > .entry-date"));' in ask
    assert 'if (date) date.style.marginInlineStart = "auto";' in ask
    for name in ("capture-ask.js", "chat-agent.js", "ask-history.js"):
        assert "placeResultBadge(row, badge);" in frontend_text(name), name


def test_a_notes_questions_are_on_its_card_and_grouped():
    """INBOX 745 (c). Measured: the lease note's card reads "1 open question"
    (115 px), the shed note's "2 open questions"; pressing one shows only its
    questions with "Show every note's"; the list has a 40 px heading per note
    (a plain labelled button, no icon-only box). Backend: test_questions_own."""
    lst = frontend_text("notes-list.js")
    assert "path: (ids) => `/questions/counts?ids=${ids}`," in lst
    assert 'ensureModule("questionsView").then(() => questionsForNote(entry.id));' in lst
    view = frontend_text("questions-view.js")
    assert 'head.className = "question-group";' in view and "function questionsForNote(entryId)" in view
    assert "if (seq !== questionsView.seq) return;" in view
    assert "item.display || item.text" in view


def test_show_them_opens_your_notes():
    """"I pressed show them, but it just navigated me to the Ask subtab on the
    notes tab as that was what I was just on". Measured: Ask open last, then
    the bell's Show them: Your notes, the filter is:untagged, 16 rows."""
    lst = frontend_text("notes-list.js")
    body = lst[lst.index("function showNotesFilter(query) {") :][:400]
    assert 'showNotesSection("browse");' in body


def test_the_folded_capture_strip_opens_when_pressed():
    """"The note capture subtab formatting toolbar wont open". Measured: before
    the box was focused the strip held only Source and the drawn word
    "Formatting", a label with nothing to press; a press on the word now
    focuses the box and the strip opens (Bold, Italic, ... 30 tools). The
    press goes through `startNewNote`, the one path that shows Capture before
    focusing (tests/test_note_making.py), so the box is never focused hidden."""
    lst = frontend_text("notes-list.js")
    body = lst[lst.index("function foldNoteToolbarForFirstPaint() {") :][:1500]
    assert 'startNewNote();' in body


def test_the_glide_follows_a_row_that_moves():
    """"There's overlap on these settings tabs in the sidebar" (the chosen
    row's fill drawn under it, beside the row's hover). Reproduced at 1024
    and 1280: 18 px inserted above the chosen row left the fill 20 px below
    it; with `childList` observed it lands on the row (0 px)."""
    shell = frontend_text("shell-reminders.js")
    body = shell[shell.index("function glideStrip(strip) {") :][:3500]
    assert "childList: true," in body


def test_every_help_button_has_the_icon_button_corner():
    """"Some tooltip buttons are circles and some are rounded squares". Census
    at 1440 before: five '?' at 50% (the Notes rail's, four in Settings)
    beside 35 icon buttons at `--radius-md`. DESIGN.md has the row."""
    css = (ROOT / "frontend" / "css" / "03-dashboard-widgets.css").read_text(encoding="utf-8")
    for selector in (".graph-help-toggle {", "#wb-help-btn {"):
        rule = css[css.index(selector) :]
        rule = rule[: rule.index("\n}")]
        assert "border-radius: var(--radius-md);" in rule and "border-radius: 50%" not in rule, selector
    assert "Some tooltip buttons are circles" in (ROOT / "docs" / "DESIGN.md").read_text(encoding="utf-8")


def test_the_lightbox_row_is_one_height():
    """"These elements in the lightbox aren't the same height" (Copy text,
    Save, Find in document). Measured at 1440 on a PDF: Save 32, Find 28, the
    ⋯ 28; after, all 32 (44 under touch, as before)."""
    css = (ROOT / "frontend" / "css" / "02-chat-graph.css").read_text(encoding="utf-8")
    rule = css[css.index(".lightbox .lightbox-find {") :]
    assert "min-height: max(2rem, var(--target-min));" in rule[: rule.index("\n}")]
    view = frontend_text("lightbox-view.js")
    assert 'opener.style.minHeight = opener.style.minWidth = "max(2rem, var(--target-min))";' in view


def test_packages_progress_stays_with_the_bundle_pressed_and_a_blocked_file_offers_install():
    """"I pressed install on the documents package and the progress bars
    appeared for the vision package" (Read scanned PDFs is in both bundles):
    measured with a running bulk of Documents' three, Vision drew 0 bars and
    0 steps after (1 and 1 before). "it should have given me ... an install
    button directly": the viewer's note on a PDF with no reader carries
    Install, which closes the viewer and opens Settings, Packages."""
    pkgs = frontend_text("settings-packages.js")
    assert "packagesUi.bulkBundle = bundleId;" in pkgs
    assert "shownIn(item.id) === bundle.id" in pkgs
    view = frontend_text("lightbox-view.js")
    assert 'revealFeature("extra-row", payload.extra);' in view


def test_the_ocr_workspace_is_found_by_its_name_and_pinches():
    """"there's no option to have the ocr workspace in the quick access
    section in the dashboard, it also isnt accessible in the" palette or Find
    anything (searching "ocr" found nothing: the command said "Read a
    document or image with AI"); "I cant two finger trackpad zoom". Measured:
    paletteCommands has "OCR workspace: read a document or image"; in the
    workspace a pinch (Ctrl wheel, 12 x 8 px) went Fit to 125%, a Ctrl notch
    back to 100%, the app's own zoom stayed 100."""
    panes = frontend_text("settings-panes.js")
    assert 'label: "ph:scan OCR workspace: read a document or image",' in panes
    lib = frontend_text("library.js")
    assert '$("ocr-page-pane")?.addEventListener("wheel", (event) => {' in lib
    assert "ocrStepZoom(ocrPinch < 0 ? 1 : -1);" in lib


def test_quick_access_has_its_own_menu_on_its_title_line():
    """"a subtle like meatball icon in the top right on the same line as the
    quick access title". Measured: the ⋯ centred on the title's line (320 and
    320 px at 1440; 317 and 317 at 390), at the row's right (1424 of 1428),
    no fill at rest, holding Edit quick access and Reset quick access."""
    dash = frontend_text("dashboard.js")
    assert 'kebabMenu(dashCustomiseItems().filter((item) => item.group === "quick"), "Quick access options")' in dash


def test_a_finished_task_opens_its_log():
    """"no way to view logs of bg processes". Measured with a routed history
    row ("Installing Search by meaning (sentence-transformers)"): the row has
    Logs (32 px line), pressing it opens Settings, Logs with the filter
    "sentence-transformers"."""
    assert "row.append(name, when, taskLogButton(item));" in frontend_text("ai-tools.js")
    settings = frontend_text("settings.js")
    assert "function taskLogButton(item)" in settings and "async function openTaskLog(item)" in settings


def test_a_turned_down_tag_can_be_undone_and_listed():
    """"if I click the not about [this tag], don't show this again, is there a
    way to undo it or see the list". Measured: x on #ollama gives "Won't
    suggest #ollama for this note again." with Undo; Undo brings it back;
    the edit form reads "Not suggested: #university" with a restore chip.
    Backend: test_suggest_tags_no_model.py."""
    tags = frontend_text("tag-suggest.js")
    assert 'for this note again.`, "Undo", () => answerSuggestedTags(entry, { restore: [tag] })' in tags
    assert 'down.append("Not suggested:");' in frontend_text("note-edit-panels.js")
