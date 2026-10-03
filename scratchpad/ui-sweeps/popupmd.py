"""Write scratchpad/popup-inventory.md from the popupinv.js JSON in /tmp/pop18.

    python3 scratchpad/ui-sweeps/popupmd.py
"""
import json
import subprocess
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "popup-inventory.md"

# name: (selector of the shell, opener, tier)
SURFACES = {
    "settings-modal": ("#settings-modal .modal-card", "header gear, Ctrl+,", "dialog"),
    "doc-ai-panel": ("#doc-ai-panel .doc-ai-card", "Documents: AI assistant", "dialog"),
    "extract-panel": ("#extract-panel .modal-card", "Extract to notes (Writing room, Documents, board selection)", "dialog"),
    "history-overlay": ("#history-overlay .modal-card", "a note's Earlier versions", "dialog"),
    "connections-overlay": ("#connections-overlay .modal-card", "a note's Connections", "dialog"),
    "binned-overlay": ("#binned-overlay .modal-card", "the bin", "dialog"),
    "skill-run-overlay": ("#skill-run-overlay .modal-card", "Run a skill with fields", "dialog"),
    "shortcuts-overlay": ("#shortcuts-overlay .modal-card", "?", "dialog"),
    "meeting-overlay": ("#meeting-overlay .modal-card", "Meeting notes", "dialog"),
    "features-overlay": ("#features-overlay .modal-card", "Tools and features", "dialog"),
    "onboarding-overlay": ("#onboarding-overlay .modal-card", "first run (slides)", "wizard, not a tier"),
    "ocr-workspace": ("#ocr-workspace .ocr-card", "Library: read text from an image or a document", "dialog (full workspace)"),
    "confirm-dialog": (".confirm-overlay .confirm-card", "confirmDialog()", "alert, not a tier"),
    "space-create-dialog": ("#space-create-dialog", "New space", "dialog"),
    "space-delete-dialog": ("#space-delete-dialog", "Delete space", "dialog"),
    "doc-storage-dialog": ("#doc-storage-dialog", "Documents: where are they kept", "dialog"),
    "doc-template-dialog": ("#doc-template-dialog", "Documents: new from a template", "dialog"),
    "quick-note": ("#quick-note", "Alt+N", "dialog"),
    "doc-history-dialog": ("#doc-history-dialog", "Documents: history", "dialog"),
    "doc-ai-history-dialog": ("#doc-ai-history-dialog", "Documents: AI edit history", "dialog"),
    "doc-word-goal-dialog": ("#doc-word-goal-dialog", "Documents: word-count goal", "dialog"),
    "tensions-dialog": ("#tensions-dialog", "Tensions widget", "dialog"),
    "dash-widgets-dialog": ("#dash-widgets-dialog", "Dashboard: widgets", "dialog"),
    "doc-dictionary-dialog": ("#doc-dictionary-dialog", "Documents: writing dictionary", "dialog"),
    "command-palette-overlay": ("#command-palette-overlay .command-palette-card", "Ctrl+Shift+A (the popup agent)", "dialog (palette)"),
    "finder-overlay": ("#finder-overlay .finder-card", "Ctrl+P, Find", "dialog (palette)"),
    "palette-overlay": ("#palette-overlay > .card", "Ctrl+K", "palette, not a tier"),
    "improve-overlay": ("#improve-overlay > .card", "Improve writing", "dialog"),
    "sketch-overlay": ("#sketch-overlay > .card", "Quick sketch", "dialog"),
    "sheet (openSheet)": ('[data-sheet] .sheet-card', "openSheet({label, name, build})", "sheet"),
    "sheet corner (Atlas guide)": ('[data-sheet="guide"] .sheet-card', "openHelpChat() (the guide)", "sheet (corner)"),
    "notif-panel": ("#notif-panel", "header bell", "panel"),
    "agent-monitor": ("#agent-monitor", "status bar activity", "panel"),
    "chat-model-panel": ("#chat-model-panel", "chat: the model's name", "popover"),
    "status-clock-detail": ("#status-clock-detail", "status bar clock", "popover"),
    "tour-card": ("#tour-card", "the guided tour", "panel"),
    "lightbox (media viewer)": (".lightbox", "a picture or document tile", "viewer, not a tier"),
    "help-popover": (".help-popover", "any [data-help-for] '?'", "popover"),
    "graph-popup": ("#graph-popup", "Graph: a node", "panel"),
    "graph-new": ("#graph-new", "Graph: add a note", "panel"),
    "graph-options": ("#graph-options", "Graph: Options", "popover (dock menu)"),
    "graph-help-panel": ("#graph-help-panel", "Graph: '?'", "popover"),
    "wb-navigator": ("#wb-navigator", "Board: overview (Shift+N)", "panel"),
}

CONFIGS = [("1440", "light"), ("1440", "dark"), ("390", "light"), ("390", "dark")]


def load(w, theme, tag):
    p = Path(f"/tmp/pop18/{w}-{theme}-{tag}.json")
    return json.load(p.open()) if p.exists() else {}


def pad(v):
    parts = v.split(" ")
    if len(set(parts)) == 1:
        return parts[0]
    if parts[0] == parts[2] and parts[1] == parts[3]:
        return f"{parts[0]} {parts[1]}"
    return " ".join(parts)


def short(v):
    return str(v).replace(", ", ",")


def ground(v):
    g = short(v.get("bg", ""))
    if v.get("bgImage"):
        g += "+grad"
    if v.get("blur", "none") != "none":
        g += " blur"
    return g


def close(v):
    if not v.get("closeW"):
        return "none" if v.get("close") in (None, "none") else v["close"]
    kind = "icon" if v.get("closeKind") == "icon" else v.get("closeKind")
    return f"{kind} {v['closeW']}x{v['closeH']} r{v['closeRight']} t{v['closeTop']}"


def row(name, v, shadows):
    if "card" not in v:
        return f"| {name} | not measured ({v.get('missing') or v.get('error')}) |" + " |" * 10
    sh = v.get("shadow", "none")
    shadows.setdefault(sh, f"S{len(shadows) + 1}")
    title = f"{v['titleSize']}/{v['titleWeight']}" if v.get("titleSize") else ""
    head = str(v.get("headH", ""))
    scrim = short(v.get("scrim", "none"))
    if v.get("scrimBlur", "none") != "none":
        scrim += " blur"
    return "| " + " | ".join([
        name, v.get("radius", ""), pad(v.get("padding", "")), short(v.get("border", "")),
        ground(v), shadows[sh], head, title, close(v), scrim, f"{v['width']}x{v['height']}",
    ]) + " |"


def table(w, theme, tag):
    d = load(w, theme, tag)
    shadows = {}
    lines = [
        "| surface | radius | padding | border | ground | shadow | head h | title px/wt | close | scrim | box |",
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for name in SURFACES:
        if name in d:
            lines.append(row(name, d[name], shadows))
    legend = [f"- {sid}: `{sh}`" for sh, sid in shadows.items()]
    return "\n".join(lines + ["", "Shadows:"] + legend)


md = []
md.append("""# Popup inventory (INBOX 456)

The owner, 2026-10-03: "make sure all the popup windows and panels are the same design and style."

One row per popup surface (42), measured with `scratchpad/ui-sweeps/popupinv.js` (Playwright, `getComputedStyle` and
`getBoundingClientRect`, no screenshot read as a number), at 1440x900 and 390x844, light and dark, before and after the
change. `scratchpad/ui-sweeps/popupall.sh before|after` writes the JSON, `popupmd.py` writes this file and `popupcmp.py`
counts the distinct values per property inside each tier.

Reading the columns: `close` is the kind, the box, then its offset from the card's right (`r`) and top (`t`) edge; `box`
is the card's width x height as opened; `scrim` is the overlay's colour (a `<dialog>`'s `::backdrop`). Phone rows read
inside their own geometry: a sheet is full width with square bottom corners, the agent panel docks to the edge.

Openers are the real ones where cheap (`openSheet`, `confirmDialog`, `openHelpChat`, the bell, a '?' press); the rest are
opened by taking `hidden` off the overlay or by `showModal()`, the shortcut `dialogheads.js` already takes. The head
and the close are found by the selectors in `popupinv.js` (named per surface where the generic search is wrong).

**Not tiers, by design** (named so the numbers below are read fairly): the welcome wizard (slides, no head), the confirm
alert (a question and its answers), the Ctrl+K palette (an input and a list), the popovers and menus (anchored, no head,
the popover shell), and the in-page columns (Ask history, the notes rail, the Web panel, the board's Library) which are
cards in the page and keep the panel-head recipe. They are listed in the DESIGN.md row.

## Surfaces, selectors, openers, tiers

| surface | shell selector | opener | tier |
| --- | --- | --- | --- |""")
for name, (sel, opener, tier) in SURFACES.items():
    md.append(f"| {name} | `{sel}` | {opener} | {tier} |")

md.append("\n## Distinct values per property inside each tier, before and after\n")
md.append("Counts of distinct values (`popupcmp.py`); fewer is more alike, one is identical. Dialog+sheet is 23 surfaces, "
          "palette 4, panel 6 (the welcome wizard, the confirm alert, the Ctrl+K palette, the OCR workspace, the popovers and "
          "the lightbox are outside the counts, by design).\n\n```")
for w_, t_ in CONFIGS:
    md.append(subprocess.run([sys.executable, str(Path(__file__).with_name("popupcmp.py")), w_, t_], capture_output=True, text=True, check=True).stdout)
md.append("```")

md.append("\n## After (the branch head)\n")
for w, theme in CONFIGS:
    md.append(f"### {w}px, {theme}\n")
    md.append(table(w, theme, "after"))
    md.append("")
md.append("\n## Before (the base, f2ccd52 plus the merge of notes-flow-rebuild)\n")
for w, theme in CONFIGS:
    md.append(f"### {w}px, {theme}\n")
    md.append(table(w, theme, "before"))
    md.append("")

md.append("\n## The Attach picker (INBOX 467), before and after\n")
md.append("Measured with `pickerinv.js` through the real `openNotePicker()` on the Chat tab (a sheet below 600), three notes "
          "seeded, one ticked. It is a panel (floating, with the dialog head), so its shell is the panel tier's; what changed is "
          "the rows (a second muted line, the category as a dot and quiet text instead of a filled chip) and the footer.")
md.append(subprocess.run([sys.executable, str(Path(__file__).with_name("pickercmp.py"))], capture_output=True, text=True, check=True).stdout)

OUT.write_text("\n".join(md) + "\n", encoding="utf-8")
print("wrote", OUT, OUT.stat().st_size, "bytes")
