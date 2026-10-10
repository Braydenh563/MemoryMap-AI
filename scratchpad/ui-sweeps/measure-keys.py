"""measure-1010 item 5: key checks in frontend/js/*.js against DEFAULT_SHORTCUTS.
python scratchpad/ui-sweeps/measure-keys.py
A 'check' is a `.key ===|==|!==|!= "X"` comparison (e.key, event.key, ev.key, evt.key ...), counted per occurrence.
Groups: 'convention' = Escape/Tab/Enter/Arrow*/Home/End/Page*/Backspace/Delete/Space (the keys the table says are
deliberately not rebindable); 'in table' = a single-character key that is the last key of a DEFAULT_SHORTCUTS chord
(so it may be the dispatcher itself); 'other' = any other literal (letters, digits, symbols used as local shortcuts)."""
import collections
import glob
import re
from pathlib import Path

src = Path("frontend/js/settings-wiring.js").read_text(encoding="utf-8")
body = src[src.index("const DEFAULT_SHORTCUTS"):]
body = body[: body.index("\n};")]
chords = re.findall(r'keys: "([^"]+)"', body)
last = {c.split("+")[-1].lower() if not c.endswith("++") else "+" for c in chords}
print("DEFAULT_SHORTCUTS entries:", len(chords), "last keys:", sorted(last))
CONV = {"escape", "tab", "enter", "arrowup", "arrowdown", "arrowleft", "arrowright", "home", "end", "pageup", "pagedown", "backspace", "delete", " ", "space"}
pat = re.compile(r'\b(?:e|ev|evt|event|ke|k)\.key\s*(?:===|==|!==|!=)\s*["\']([^"\']*)["\']')
tot = collections.Counter()
per = collections.defaultdict(collections.Counter)
other_keys = collections.defaultdict(collections.Counter)
for f in sorted(glob.glob("frontend/js/*.js")):
    for m in pat.finditer(Path(f).read_text(encoding="utf-8")):
        k = m.group(1)
        g = "convention" if k.lower() in CONV else ("in table" if k.lower() in last else "other")
        per[f.split("/")[-1]][g] += 1
        tot[g] += 1
        if g != "convention":
            other_keys[f.split("/")[-1]][k] += 1
for f, c in sorted(per.items(), key=lambda kv: -sum(kv[1].values())):
    print(f"{f:34s} total {sum(c.values()):3d}  convention {c['convention']:3d}  in-table-key {c['in table']:3d}  other {c['other']:3d}")
print("TOTAL", sum(tot.values()), dict(tot))
# which other literals
for f, c in other_keys.items():
    pass
