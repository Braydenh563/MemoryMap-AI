import re

file_path = "src/memorymap/ai/question_noise.py"
with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Extract lines 4732 to 4866 (index 4731 to 4866)
to_move = lines[4732:4866]

# Remove them from the original location
del lines[4732:4866]

# Find where to insert them. They need to go right before `})\n` at line 4481.
insert_idx = 0
for i, line in enumerate(lines):
    if line.strip() == "})":
        insert_idx = i
        break

# Insert them
lines = lines[:insert_idx] + to_move + lines[insert_idx:]

with open(file_path, "w", encoding="utf-8") as f:
    f.writelines(lines)

print("Fixed syntax error.")
