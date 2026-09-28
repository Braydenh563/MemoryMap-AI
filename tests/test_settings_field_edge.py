"""Settings fields end at the row's right edge, and no group is a card with
nothing in it (INBOX 426 u, images 85 and 88).

Measured with `scratchpad/ui-sweeps/settingsalign.js` at 1440: the General
pane's five fields ended 236 to 308px short of their group's edge (a fixed
16rem label column), and Profile had a group holding one line, "Stays on
this computer like everything else", left behind when autosave hid its Save
button. After: 0 of 38 label-and-field rows short of the edge.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT / "frontend"


def test_a_settings_label_takes_the_slack_so_its_field_ends_the_row() -> None:
    css = (FRONTEND / "css" / "07-whiteboard-misc.css").read_text(encoding="utf-8")
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    rule = re.search(
        r"#settings-modal \.settings-section \.row > label:first-child[^{]*\{([^}]*)\}", css
    )
    assert rule and re.search(r"flex:\s*1 1 16rem", rule.group(1)), rule and rule.group(1)


def test_the_profile_save_status_is_not_a_card_of_its_own() -> None:
    html = (FRONTEND / "index.html").read_text(encoding="utf-8")
    assert "Stays on this computer like everything else." not in html
    profile = html[html.index('id="pref-profile-count"'):]
    profile = profile[: profile.index("</div>\n            </div>")]
    assert 'class="row align-center prefs-save-row"' in profile
    assert 'id="prefs-status"' in profile
