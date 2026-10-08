import ast
import json
import re

file_path = "src/memorymap/ai/composer_tables.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

replacements = {
    '"and_join"': [
        "And ", "Plus, ", "Additionally, ", "Also, ", "What's more, ", "On top of that, ",
        "Furthermore, ", "Moreover, ", "Along with this, ", "Together with that, ", "At the same time, ",
        "Coupled with this, ", "Not to mention, ", "As well as that, ", "To add to this, ",
        "In addition, ", "To build on that, ", "Adding to the thought, ", "Expanding on this, "
    ],
    '"separately"': [
        "Separately", "Elsewhere", "In another place", "In a different note", "On another topic",
        "Changing gears", "On a separate note", "Meanwhile", "In a totally different entry",
        "Pivoting slightly", "Shifting focus", "In unrelated notes", "Off to the side", "On a different track"
    ],
    '"elsewhere"': [
        "Elsewhere", "In other notes", "Across your other entries", "In a different spot",
        "Looking somewhere else", "In another corner of your notebook", "Somewhere else entirely",
        "In another part of your records", "Looking at other entries", "In completely different notes"
    ],
    '"another_note"': [
        "On another note", "In another entry", "From a different note", "Looking at a separate note",
        "Switching to another note", "Taking from another note", "In a completely different entry",
        "According to another record", "Turning to another note", "As captured in another note"
    ],
    '"later_on"': [
        "Later, on ", "Further down the line on ", "Sometime after, on ", "Then, on ",
        "Following that, on ", "Subsequent to that, on ", "Eventually, on ", "A bit later, on ",
        "Moving forward to ", "Fast forward to ", "As time passed, on ", "Later down the road on "
    ],
    '"then_on"': [
        "Then on ", "Next on ", "After that, on ", "Subsequently on ", "Following that, on ",
        "And then on ", "Which brings us to ", "The next entry on ", "The next record on ",
        "Continuing on "
    ],
    '"earlier_on"': [
        "Earlier, on ", "Before that, on ", "Prior to this, on ", "Looking back, on ",
        "Going back in time to ", "Previously, on ", "In a prior entry on ", "Tracing back to ",
        "Way back on ", "Earlier in your notes on ", "Before all this, on "
    ],
    '"before_that"': [
        "Before that, on ", "Even earlier, on ", "Prior to that, on ", "Beforehand, on ",
        "Stepping back further to ", "Preceding that, on ", "Long before that, on ",
        "Going even further back to ", "Before this occurred, on "
    ]
}

def inject():
    global content
    for key, items in replacements.items():
        pattern = r'(' + key + r':\s*\{[\s\S]*?"natural":\s*\[)([\s\S]*?)(\],)'
        def rep(m):
            formatted_items = ",\n            ".join([f'"{x}"' for x in items])
            return f'{m.group(1)}\n            {formatted_items}\n        {m.group(3)}'
        content = re.sub(pattern, rep, content)

inject()

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Injected additional variations.")
