"""The status bar fits its window with and without a running job (libtl-0926).

Measured (`errors.js`, then per zone): at 820 the bar's items needed 813px
of 800, so Redo ended at 822.8 and every tab scrolled sideways by 3px; and a
running job's label never shortened, because the state zone's
`min-width: min-content` counted the whole `nowrap` label, so at 1024 a
208px label pushed the page 52px wide (errors.js's seven tabs at 1024, the
first seven it visited while a new server's jobs ran), 30px at 768.
"""

import re
from pathlib import Path

CSS = Path(__file__).resolve().parent.parent / "frontend" / "css"
SHELL = (CSS / "00-tokens-shell.css").read_text(encoding="utf-8")
RESPONSIVE = (CSS / "10-responsive.css").read_text(encoding="utf-8")


def _rule(css: str, selector: str) -> str:
    match = re.search(re.escape(selector) + r"\s*\{([^}]*)\}", css)
    assert match, selector
    return match.group(1)


def test_a_job_label_is_sized_from_nothing_and_grows_into_the_room():
    task = _rule(SHELL, "#status-bar #status-task")
    assert "width: 0;" in task
    assert "max-width: max-content;" in task
    assert "min-width: calc(var(--status-h) + var(--space-3));" in task
    # The zone takes the free room rather than splitting it with the spacer.
    state = SHELL[SHELL.index('.status-zone[data-status-zone="state"] {') :][:4000]
    assert "flex-grow: 1000;" in state[: state.index("}")]


def test_the_notebook_count_gives_way_from_820_to_959():
    block = RESPONSIVE[RESPONSIVE.index("@media (min-width: 820px) and (max-width: 959.98px) {") :][:200]
    assert "#status-notes {\n    display: none;" in block


def test_a_tool_row_fills_its_grid_cell_and_keeps_its_lines_packed():
    # Settings, Tools it can use, is two columns; a row only as tall as its
    # own text ended 27.6px above its neighbour's (toolgrid.js, at display
    # scale 1, 1.25 and 1.5), read as offset dividers.
    widgets = (CSS / "03-dashboard-widgets.css").read_text(encoding="utf-8")
    assert "display: grid;" in _rule(widgets, "#tool-list li")
    assert "align-content: start;" in _rule(widgets, ".tool-row.setting-check")


def test_below_1024_the_bar_keeps_slack_for_a_running_job():
    # 2026-10-03, errors.js at 820: the filing model warming up (a spinner,
    # "1 running") put Redo at 854 in an 820 window. Below 1024 the key hint
    # goes, and Ask, Guide, Find, reminders and the running count keep their
    # icon and number; the words stay readable to a screen reader (clipped,
    # never `display: none`). Measured after, with a 209px job: 0px over at
    # 1023, 820 and 721.
    block = SHELL[SHELL.index("@media (max-width: 1023.98px) {") :]
    block = block[: block.index("\n}\n")]
    assert "#status-command .status-key {\n    display: none;" in block
    for selector in (
        "#status-reminders > b + span",
        "#status-activity > b + span",
        "#status-agent > span",
        "#status-guide > span",
        "#status-find > span",
    ):
        assert selector in block, selector
    hidden = block[block.index("#status-find > span {") :]
    hidden = hidden[: hidden.index("}")]
    assert "clip-path: inset(50%);" in hidden and "display: none" not in hidden
