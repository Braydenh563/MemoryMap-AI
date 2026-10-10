"""Should the launcher build .venv with --system-site-packages?

Opt-in only (`MEMORYMAP_SYSTEM_SITE_PACKAGES=1 ./start.sh`), for a machine
that already has a large package such as CUDA torch installed system-wide
and where a second 1 GB copy in .venv is the thing to avoid. The risk is the
usual one: a system package that is too old or too new for requirements.txt
shadows what pip would have installed, and the app fails later in a way that
looks unrelated. So the one package the app is sensitive to, torch, is
checked against requirements.txt's own range first, and the answer is a
refusal with a reason rather than a venv that half works.

Standard library only: start.sh runs it with the system Python, before any
.venv exists. `python scripts/system_site_packages.py` prints `ok` or
`refuse: <reason>` and exits 0 or 1.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

#: Fallback when requirements.txt cannot be read (a script run from elsewhere).
DEFAULT_RANGE = ((2, 2), (3, 0))


def _numbers(version: str) -> tuple[int, ...]:
    """`2.4.1+cu121` -> (2, 4, 1); anything unreadable -> ()."""
    head = re.match(r"\d+(?:\.\d+)*", version.strip())
    return tuple(int(part) for part in head.group(0).split(".")) if head else ()


def torch_range(requirements: str | None) -> tuple[tuple[int, ...], tuple[int, ...]]:
    """(minimum, exclusive maximum) from the `torch>=X,<Y` line."""
    found = re.search(r"^torch>=([\d.]+),<([\d.]+)", requirements or "", re.MULTILINE)
    if not found:
        return DEFAULT_RANGE
    return _numbers(found.group(1)), _numbers(found.group(2))


def decide(system_torch: str | None, requirements: str | None = None) -> tuple[bool, str]:
    """(allowed, reason). No system torch is allowed: the flag then changes
    nothing that matters, and pip fills the rest in as usual."""
    if not system_torch:
        return True, "no system torch to share; pip will install what is missing"
    have = _numbers(system_torch)
    low, high = torch_range(requirements)
    if not have:
        return False, f"the system torch version {system_torch!r} could not be read"
    if not low <= have < high:
        want = f">={'.'.join(map(str, low))},<{'.'.join(map(str, high))}"
        return False, f"the system torch is {system_torch}, outside requirements.txt's {want}"
    return True, f"the system torch {system_torch} is inside requirements.txt's range"


def system_torch_version() -> str | None:
    from importlib import metadata

    try:
        return metadata.version("torch")
    except metadata.PackageNotFoundError:
        return None


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    try:
        text = (root / "requirements.txt").read_text(encoding="utf-8")
    except OSError:
        text = None
    allowed, reason = decide(system_torch_version(), text)
    print("ok" if allowed else f"refuse: {reason}")
    return 0 if allowed else 1


if __name__ == "__main__":
    sys.exit(main())
