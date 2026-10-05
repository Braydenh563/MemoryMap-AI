"""Pressing a setting's words toggles the setting, not its help button.

`collapseLongSettingHints` (frontend/js/settings.js) puts a "?" button in a
`.setting-check` row *before* the row's checkbox, so the layout grid can give
the two their own columns. A `<label>` activates its first labelable
descendant, and a button is labelable, so pressing the words of "Keep Atlas on
this machine" (or any row with a long hint) opened the help popover and left
the switch as it was; only the small switch itself worked. Found by
`scratchpad/ui-sweeps/deepflows.js`, whose settings flow presses each switch by
its row. The row's `for` now names its checkbox, which is what a label uses
when it has one.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess

import pytest
from tests._app_js import JS_DIR

pytestmark = pytest.mark.skipif(not shutil.which("node"), reason="needs node")

HARNESS = r"""
%(source)s
let seq = 0;
function makeRow({ withId, tag = 'LABEL' }) {
  const input = { id: withId ? 'given-id' : '', type: 'checkbox' };
  const inserted = [];
  const row = {
    tagName: tag,
    htmlFor: '',
    querySelector: () => input,
    insertBefore: (node, before) => inserted.push([node, before]),
  };
  const hint = {
    dataset: {},
    classList: { add() {} },
    textContent: 'x'.repeat(120),
    parentElement: { textContent: 'The setting ' + 'x'.repeat(120), closest: (sel) => (sel === '.setting-check' ? row : null) },
  };
  const scope = { querySelectorAll: () => [hint] };
  return { input, row, inserted, hint, scope };
}
const document = { createElement: () => ({ setAttribute() {}, className: '', style: {} }), getElementById: () => null };
const setLabel = () => {};
const wireHelpPopover = () => {};
const out = {};
for (const [name, opts] of Object.entries({ withId: { withId: true }, noId: { withId: false }, div: { withId: false, tag: 'DIV' } })) {
  const r = makeRow(opts);
  collapseLongSettingHints(r.scope);
  out[name] = { htmlFor: r.row.htmlFor, inputId: r.input.id, placedBeforeInput: r.inserted.length === 1 && r.inserted[0][1] === r.input };
}
process.stdout.write(JSON.stringify(out));
"""


def _run() -> dict:
    source = (JS_DIR / "settings.js").read_text(encoding="utf-8")
    fn = re.search(r"^function collapseLongSettingHints\(.*?^\}", source, re.S | re.M)
    const = re.search(r"^const SETTINGS_HINT_INLINE_CHARS = \d+;\n(?://.*\n)?let settingSwitchSeq = 0;", source, re.M)
    assert fn and const, "collapseLongSettingHints is gone"
    script = HARNESS % {"source": const.group(0) + "\n" + fn.group(0)}
    return json.loads(subprocess.run(["node", "-e", script], capture_output=True, text=True, check=True).stdout)


def test_a_row_with_a_checkbox_id_points_its_label_at_it():
    got = _run()["withId"]
    assert got["placedBeforeInput"] is True  # the layout is unchanged
    assert got["htmlFor"] == "given-id"


def test_a_checkbox_without_an_id_is_given_one_for_the_label():
    got = _run()["noId"]
    assert got["inputId"], "the checkbox needs an id for the label to name"
    assert got["htmlFor"] == got["inputId"]


def test_a_row_that_is_not_a_label_is_left_alone():
    assert _run()["div"]["htmlFor"] == ""
