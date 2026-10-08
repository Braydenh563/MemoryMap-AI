import ast
import json
import re

file_path = "src/memorymap/ai/composer_tables.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

replacements = {
    '"going_by"': [
        "Going by your notes", "Based on your records", "According to what you saved",
        "If we look at your notes", "Drawing from your entries", "Judging by your notebook",
        "From what is written here", "According to your entries", "Relying on your notes",
        "Based on what I found"
    ],
    '"closest_a"': [
        "The closest your notes come is this: ", "Here is the nearest mention: ",
        "This is the closest match I found: ", "The closest thing to that is: ",
        "Here's the best match from your notes: ", "This seems to be the closest record: ",
        "The most relevant entry is this: ", "The nearest hit I could find is: "
    ],
    '"closest_b"': [
        "Nothing here says it outright. The nearest is: ", "It doesn't say exactly, but the closest is: ",
        "I couldn't find an exact match, but this is close: ", "There's no direct mention. The best match is: ",
        "Not stated explicitly, but the closest thing is: ", "There isn't a direct answer, but this comes close: ",
        "I didn't see an exact hit. The nearest entry is: "
    ],
    '"notes_have"': [
        "Here is what your notes say on that: ", "This is what you have saved: ",
        "Here's what your records show: ", "Your notes capture this: ", "Your notebook says: ",
        "Here is the relevant information: ", "This is what I found on that: ",
        "Here's the data you saved: ", "Your entries state the following: "
    ],
    '"disagree_lead"': [
        "Your notes may disagree here. ", "There seems to be a conflict in your notes. ",
        "I'm seeing some conflicting information. ", "Your notes have differing accounts on this. ",
        "Interestingly, your notes disagree here. ", "There's a bit of a contradiction in your records. ",
        "Your entries are saying two different things here. "
    ],
    '"timeline"': [
        "In the order you wrote them:", "Arranged chronologically:", "Here is the timeline:",
        "Looking at them in order:", "Tracing the sequence of events:", "In chronological order:",
        "Following the timeline:", "From oldest to newest:"
    ],
    '"each_side"': [
        "Here is what each says.", "Let's look at both sides.", "Here is the breakdown of each.",
        "Breaking down both perspectives:", "Looking at the different takes:",
        "Here's what you wrote for each.", "This is the information for both sides."
    ],
    '"missing"': [
        "None of these notes mention ", "These notes do not talk about ",
        "I couldn't find any reference to ", "There is nothing in these notes regarding ",
        "No note found brings up ", "I don't see any mention of ", "It looks like these notes omit ",
        "None of these records discuss "
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

print("Injected final massive variations.")
