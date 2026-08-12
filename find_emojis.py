import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('frontend/app.js', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if any(ord(c) > 127 for c in line) and 'EMOJI_TO_PHOSPHOR' not in line and 'parseIconFromText' not in line:
            # check if it contains actual emojis
            s = ''.join(c for c in line if ord(c) > 127 and c not in '—’”‘“–…✕↻⟲×✓✅⚙⬇⭳·')
            if s.strip():
                print(f"{i+1}: {line.strip()}")
