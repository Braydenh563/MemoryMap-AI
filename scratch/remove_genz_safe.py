import re

file_path = "src/memorymap/ai/composer_tables.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# We need to remove the exact blocks we added.
# A block we added looks like this:
#         "genz": [
#             "no cap, your notes say: ",
#             "tbh according to your notes: ",
#             ...
#         ],
# We will use a non-greedy match that strictly stops at the first closing bracket.
# Because the genz blocks contain no brackets inside them, this is safe.

content = re.sub(r'\s*"genz": \[[^\]]*?\],', '', content)

content = content.replace('"genz"', '')
content = content.replace('VOICES = ("natural", "professional", )', 'VOICES = ("natural", "professional")')
content = content.replace('VOICES = ("natural", "professional", , )', 'VOICES = ("natural", "professional")')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Safely removed all GenZ references.")
