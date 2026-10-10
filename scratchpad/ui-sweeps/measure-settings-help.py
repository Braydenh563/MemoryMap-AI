"""measure-1010 item 4: PreferencesBody keys against Settings help.
python scratchpad/ui-sweeps/measure-settings-help.py   (from the repo root, PYTHONPATH=src)

For a key, find the control: an element id `$("id")` on a settings-*.js line within 3 lines of the key
(or a `pref-`/`set-` id in index.html whose name matches the key). The control's block in index.html is the
text between the previous <h3 and the next <h3 / </section>. 'popover' = a data-help-for in the block;
'line' = a <p class="muted|hint|help..."> or <small> within 4 lines of the control; else 'none'.
"""
import glob
import re

from memorymap.api.routes_settings import PreferencesBody

html = open("frontend/index.html", encoding="utf-8").read().split("\n")
js = {f: open(f, encoding="utf-8").read().split("\n") for f in glob.glob("frontend/js/*.js")}
keys = list(PreferencesBody.model_fields)
print("PreferencesBody keys:", len(keys))
total_help = sum("data-help-for" in line for line in html)
print("data-help-for in index.html (all):", total_help)

def ids_for(key):
    out = []
    for f, lines in js.items():
        if not re.search(r"settings|app\.js", f):
            continue
        for i, line in enumerate(lines):
            if re.search(rf"\b{key}\b", line):
                for m in lines[max(0, i - 3): i + 4]:
                    out += re.findall(r'\$\("((?:pref|set)-[\w-]+)"\)', m)
    return list(dict.fromkeys(out))

def line_of(idv):
    for i, line in enumerate(html):
        if f'id="{idv}"' in line:
            return i
    return None

res = {"popover": [], "line": [], "none": [], "nocontrol": []}
for k in keys:
    ids = ids_for(k)
    ln = [line_of(i) for i in ids if line_of(i) is not None]
    if not ln:
        res["nocontrol"].append(k)
        continue
    L = ln[0]
    a = L
    while a > 0 and "<h3" not in html[a] and "<section" not in html[a]:
        a -= 1
    b = L
    while b < len(html) - 1 and "<h3" not in html[b + 1] and "</section>" not in html[b + 1]:
        b += 1
    block = "\n".join(html[a: b + 1])
    near = "\n".join(html[max(0, L - 4): L + 5])
    if "data-help-for" in block:
        res["popover"].append(k)
    elif re.search(r'<p class="[^"]*(muted|hint|help)|<small|class="help', near):
        res["line"].append(k)
    else:
        res["none"].append(k)
for t, v in res.items():
    print(t, len(v), v)
