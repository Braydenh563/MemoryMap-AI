import re

file_path = "src/memorymap/ai/composer_tables.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# We will find every block of "natural" and duplicate it to create a "genz" block right before "professional".
# Also we will expand "professional" blocks.

def enrich_block(match):
    full_natural_block = match.group(1)
    # The natural block looks like: "natural": [ "A", "B" ],
    # Let's extract the strings to make genz strings
    strings = re.findall(r'"(.*?)"', full_natural_block)
    
    # Create genz strings by applying transformations
    genz_strings = []
    for s in strings[:10]: # take first 10
        s_lower = s.lower()
        if "note" in s_lower or "wrote" in s_lower:
            genz_strings.append(s.replace("Your notes", "ur notes").replace("your notes", "ur notes").replace("You wrote", "u wrote").replace("you wrote", "u wrote"))
        else:
            genz_strings.append(s)
            
    # Prepend GenZ slang to a few
    if genz_strings:
        genz_strings[0] = "no cap, " + genz_strings[0].lower()
        if len(genz_strings) > 1:
            genz_strings[1] = "tbh " + genz_strings[1].lower()
        if len(genz_strings) > 2:
            genz_strings[2] = "lowkey " + genz_strings[2].lower()
            
    genz_formatted = ",\n            ".join(f'"{x}"' for x in genz_strings)
    genz_block = f'"genz": [\n            {genz_formatted}\n        ],\n        '
    
    # Return original natural block, followed by new genz block, followed by the rest
    return full_natural_block + genz_block + '"professional":'

# This regex matches the natural block and the start of the professional block
content = re.sub(r'("natural":\s*\[.*?\]\s*,\s*)"professional":', enrich_block, content, flags=re.DOTALL)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Injected dynamic genz variations!")
