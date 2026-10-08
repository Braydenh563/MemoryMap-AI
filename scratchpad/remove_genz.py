import re

file_path = "src/memorymap/ai/composer_tables.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Remove the genz blocks completely.
# A genz block looks like: "genz": [ ... ],
content = re.sub(r'\s*"genz":\s*\[\s*.*?\s*\],\s*', '\n        ', content, flags=re.DOTALL)

# Remove 'genz' from VOICES if it exists
content = content.replace('"genz"', '')
content = content.replace('VOICES = ("natural", "professional", )', 'VOICES = ("natural", "professional")')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Removed all GenZ references.")
