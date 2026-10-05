"""List every CSS rule that lets something scroll sideways, with its selector (INBOX 622)."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
for path in sorted((ROOT / "frontend" / "css").glob("*.css")):
    text = re.sub(r"/\*.*?\*/", lambda m: " " * len(m.group(0)), path.read_text(encoding="utf-8"), flags=re.S)
    for m in re.finditer(r"([^{}]+)\{([^{}]*)\}", text):
        if re.search(r"overflow(-x)?\s*:\s*(auto|scroll)", m.group(2)):
            sel = " ".join(m.group(1).split())
            if "settings" in sel or "modal" in sel:
                print(path.name, "|", sel[:160], "|", re.search(r"overflow(-x)?\s*:[^;]*", m.group(2)).group(0))
