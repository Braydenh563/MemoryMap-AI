"""The bottom status bar has three named zones, in one order (INBOX 307).

The owner: "I feel like the navigation and undo/redo buttons keep getting
pushed further and further to the left on the bottom bar, is there a better way
to restructure the right side of the bottom bar??"

It was drift rather than a placement mistake. The run after `.status-spacer`
was one flat list, so every control the bar gained was appended at its right
end and moved the pair before it along. Measured at 1440 before the fix, right
to left in the order they were added: Find (2026-09-20), Guide, Ask the agent,
Command palette, then redo 391px from the content edge of the bar and the
navigation group 467px.

Putting them back would have lasted until the next feature, so the right end
has an owner and this lint is what holds it:

- **Three zones, in one order.** `state`, then `tools`, then `control`, each
  exactly once, as `data-status-zone` on a direct child of `#status-bar`.
- **Nothing loose.** Every control in the bar is inside a zone. A control
  dropped straight into the footer is the drift starting again.
- **`control` has fixed membership.** Back, forward, the history popup, undo
  and redo, and nothing else, ever. A new control in the bar is a doorway and
  belongs in `tools`, which is the only zone that grows: it grows leftwards
  from `control`, so the pair at the end cannot move again.

Like the other frontend lints this cannot see the DOM.
`scratchpad/ui-sweeps/uitrio.js` measures the same bar against a running app
(the zones in order, redo flush with the content edge at 1440, and the control
zone reachable without a drag at 390, where the bar scrolls and the order
deliberately flips).
"""

from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "frontend" / "index.html"

ZONES = ["state", "tools", "control"]

#: The right end's membership, and the whole point of the lint. Changing this
#: set is a design decision about what owns the corner of the window, not a
#: tidy-up: anything else added to the bar goes in `tools`.
CONTROL_ZONE = {
    "status-back",
    "status-forward",
    "status-nav-history",
    "status-undo",
    "status-redo",
}

#: Children of the footer that are not part of the run of controls. The clock's
#: detail popover is `position: fixed` and placed from the button's own rect
#: (app.js, `openStatusClockDetail`), so it is in the footer for ownership
#: rather than for layout.
NOT_IN_THE_RUN = {"status-clock-detail"}


class _Parser(HTMLParser):
    """A small stack walker: enough to know, for each element, whether the
    status bar encloses it and which zone it is in."""

    def __init__(self) -> None:
        super().__init__()
        self.stack: list[dict] = []
        self.void = {"input", "img", "br", "hr", "meta", "link"}
        #: Zone names in the order they are opened.
        self.zone_order: list[str] = []
        #: Zone name -> the ids of the controls inside it.
        self.zone_controls: dict[str, list[str]] = {}
        #: Controls sitting in the bar but in no zone.
        self.loose: list[str] = []
        #: Direct children of the footer, as (tag, id, zone-or-None).
        self.children: list[tuple[str, str, str | None]] = []
        self.saw_bar = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        ident = a.get("id") or ""
        classes = set((a.get("class") or "").split())
        in_bar = any(f["bar"] for f in self.stack)
        zone = next((f["zone"] for f in reversed(self.stack) if f["zone"]), None)

        if in_bar and self.stack and self.stack[-1]["bar"]:
            self.children.append((tag, ident, a.get("data-status-zone")))

        is_bar = ident == "status-bar"
        if is_bar:
            self.saw_bar = True
        this_zone = a.get("data-status-zone")
        if this_zone and in_bar:
            self.zone_order.append(this_zone)
            self.zone_controls.setdefault(this_zone, [])

        if in_bar and ident not in NOT_IN_THE_RUN:
            # A control is a button, or anything carrying the bar's own item
            # class: the AI status dot is a button inside a wrapper span, and
            # the two badges are spans with `.chip`.
            is_control = tag == "button" or "status-item" in classes
            if is_control:
                if zone:
                    self.zone_controls[zone].append(ident or f"(unnamed {tag})")
                else:
                    self.loose.append(ident or f"(unnamed {tag})")

        frame = {"tag": tag, "bar": is_bar, "zone": this_zone if in_bar else None}
        if tag not in self.void:
            self.stack.append(frame)

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i]["tag"] == tag:
                del self.stack[i:]
                return


def _parsed() -> _Parser:
    parser = _Parser()
    parser.feed(INDEX.read_text(encoding="utf-8"))
    return parser


def test_the_bar_has_its_three_zones_in_order():
    bar = _parsed()
    assert bar.saw_bar, "#status-bar is not in index.html any more"
    assert bar.zone_order == ZONES, (
        f"the status bar's zones are {bar.zone_order}, and they have to be {ZONES}: "
        "state holds what the app is doing, tools holds the doorways and is the only "
        "zone that grows, control ends the bar (INBOX 307)"
    )


def test_no_control_sits_loose_in_the_bar():
    bar = _parsed()
    assert not bar.loose, (
        f"these controls are in #status-bar but in no zone: {bar.loose}. "
        "A control dropped straight into the footer is how the navigation and "
        "undo pair came to be pushed 391px off the end of the bar; put it in "
        'data-status-zone="tools"'
    )


def test_the_control_zone_keeps_its_fixed_membership():
    bar = _parsed()
    found = set(bar.zone_controls.get("control", []))
    assert found == CONTROL_ZONE, (
        f"the control zone holds {sorted(found)}, and it holds exactly "
        f"{sorted(CONTROL_ZONE)}. This zone owns the right end of the window and "
        "does not take new members: a control added to the bar is a doorway and "
        "goes in the tools zone, which grows leftwards from this one"
    )


def test_the_tools_zone_is_where_the_doorways_are():
    """The other half of the same rule, so a new control cannot be parked in
    `state` instead and re-start the drift from the other side."""
    bar = _parsed()
    tools = bar.zone_controls.get("tools", [])
    assert tools, "the tools zone has no controls in it, which cannot be right"
    assert set(tools).isdisjoint(CONTROL_ZONE), (
        f"these belong to the control zone and are in tools: "
        f"{sorted(set(tools) & CONTROL_ZONE)}"
    )


def test_every_child_of_the_bar_is_a_zone_the_spacer_or_the_clock_popover():
    bar = _parsed()
    stray = [
        (tag, ident)
        for tag, ident, zone in bar.children
        if zone is None and ident not in NOT_IN_THE_RUN
    ]
    # The spacer is the one class-only child; it carries no id and no zone.
    stray = [(tag, ident) for tag, ident in stray if ident or tag != "span"]
    assert not stray, (
        f"these are direct children of #status-bar and are neither a zone nor the "
        f"spacer nor the clock's popover: {stray}"
    )
