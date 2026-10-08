with open('src/memorymap/vendor/rake.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    line = line.replace('.iteritems()', '.items()')
    if 'print ' in line and not line.strip().startswith('#'):
        # Just wrap everything after print with parens
        start = line.find('print ')
        before = line[:start]
        after = line[start+6:].rstrip()
        new_lines.append(f"{before}print({after})\n")
    else:
        new_lines.append(line)

with open('src/memorymap/vendor/rake.py', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
print("Fixed Python 3 compatibility.")
