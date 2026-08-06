import re

with open('frontend/index.html', encoding='utf-8') as f:
    html = f.read()

with open('frontend/app.js', encoding='utf-8') as f:
    js = f.read()

ids = set(re.findall(r'id="([^"]+)"', html))
js_ids = set(re.findall(r'\$\("([^"]+)"\)', js))

missing = js_ids - ids
print(f"Missing IDs: {missing}")

for miss in missing:
    for i, line in enumerate(js.splitlines()):
        if f'$("{miss}")' in line:
            print(f"app.js:{i+1}: {line.strip()}")
