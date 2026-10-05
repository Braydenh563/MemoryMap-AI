"""Print the boot CSS and JS gzip totals the way tests/test_boot_budget.py counts them."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "src"))
from tests import test_boot_budget as t  # noqa: E402

for name, pat, cap in (("css", t.STYLE, t.BOOT_CSS_CAP), ("js", t.SCRIPT, t.BOOT_JS_CAP)):
    print(name, sum(t._boot(pat).values()), "cap", cap)
