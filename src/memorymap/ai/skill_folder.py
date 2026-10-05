"""The user skills folder: a skill is a Markdown file (WORLD_CLASS_PLAN B8, H4).

The plugin surface in its smallest honest form. A person (or another program:
a coding agent, a sync tool, a script) drops a `.md` file into
`<data dir>/skills/`, and the next time anything asks for the skill list it is
there: the chat's Skills menu, Settings, Skills, the agent's `list_skills` and
`run_skill`. No restart, no import step, no registration call. Deleting the
file removes it the same way.

**The file.** Optional front matter between `---` lines, then the prompt, then
optionally a `## Steps` heading with a numbered or bulleted list::

    ---
    name: Weekly review
    description: Looks over the week and lists what is unfinished
    when: on a Friday afternoon
    tools: search_notes, list_notes
    inputs: topic
    ---
    Find this week's notes about {{topic}} and list what is still open.

    ## Steps
    1. Search for notes about {{topic}} from the last seven days.
    2. List the ones with an unticked checkbox.

Every field goes through `skills.normalise`, the same check a skill saved in
Settings passes, so a file cannot do anything a typed skill could not: the
same tool allowlist, the same "a skill may not start a skill" rule, the same
limits. The name defaults to the file's name.

**Read per request, parsed once per version.** The folder is listed on every
call (a directory listing of a few files costs microseconds); a file is
parsed again only when its modification time or size moved. That is what
"picked up without a restart" costs, and it is the whole of it.

**What a file cannot do.** Shadow a built-in or a skill saved in Settings: the
name that was there first keeps it, and the file is reported as a problem
rather than silently winning or silently vanishing. Be edited or deleted from
the app: it is the person's file, in a folder they chose to write to, and the
app writing back into it would be a second owner. Settings shows where the
folder is and which files did not load, with the reason.

Free of app imports past `skills`, for the reason `skills.py` gives.
"""

from __future__ import annotations

import logging
import re
import threading
from pathlib import Path

from memorymap.ai import skills

logger = logging.getLogger("memorymap.skills")

FOLDER_NAME = "skills"
#: More files than this are not read: a folder that size is a mistake (a
#: notes folder pointed here), and listing it on every chat open would cost.
MAX_FILES = 50
#: A skill is a prompt and ten short steps; a file past this is not a skill.
MAX_FILE_BYTES = 32 * 1024

_FRONT = re.compile(r"\A---[ \t]*\r?\n(.*?)\r?\n---[ \t]*(?:\r?\n|\Z)", re.S)
_STEPS_HEADING = re.compile(r"^#{1,6}\s*steps\s*:?\s*$", re.I | re.M)
_LIST_ITEM = re.compile(r"^\s*(?:\d+[.)]|[-*+])\s+(.*\S)\s*$")

_lock = threading.Lock()
#: path -> ((mtime_ns, size), parsed skill dict or SkillError message)
_cache: dict[str, tuple[tuple[int, int], dict | str]] = {}


def folder(config) -> Path | None:
    """Where this notebook's skill files live (made on first look); None for a
    config with no data folder (a stand-in some callers pass)."""
    data_dir = getattr(config, "data_dir", None)
    if data_dir is None:
        return None
    path = Path(data_dir) / FOLDER_NAME
    try:
        path.mkdir(parents=True, exist_ok=True)
    except OSError:
        pass
    return path


def parse(text: str, fallback_name: str) -> dict:
    """One file's text as the raw dict `skills.normalise` takes."""
    raw: dict = {}
    body = text
    match = _FRONT.match(text)
    if match:
        body = text[match.end():]
        for line in match.group(1).splitlines():
            if not line.strip() or line.lstrip().startswith("#") or ":" not in line:
                continue
            key, value = line.split(":", 1)
            raw[key.strip().lower().replace("-", "_")] = value.strip()
    out: dict = {
        "name": raw.get("name") or fallback_name,
        "description": raw.get("description", ""),
        "when_to_use": raw.get("when_to_use") or raw.get("when", ""),
    }
    for key in ("tools", "inputs"):
        if raw.get(key):
            out[key] = [part.strip() for part in raw[key].split(",") if part.strip()]
    heading = _STEPS_HEADING.search(body)
    if heading:
        prompt, rest = body[: heading.start()], body[heading.end():]
        steps = []
        for line in rest.splitlines():
            item = _LIST_ITEM.match(line)
            if item:
                steps.append(item.group(1))
            elif line.strip() and steps:
                # A wrapped line belongs to the step above it.
                steps[-1] = f"{steps[-1]} {line.strip()}"
        out["steps"] = steps
    else:
        prompt = body
    out["prompt"] = prompt.strip()
    return out


def _load(path: Path, known_tools: set[str] | None) -> dict | str:
    try:
        stat = path.stat()
    except OSError as exc:
        return f"could not be read ({exc.strerror or exc})"
    key = str(path)
    stamp = (stat.st_mtime_ns, stat.st_size)
    with _lock:
        hit = _cache.get(key)
    if hit and hit[0] == stamp:
        return hit[1]
    if stat.st_size > MAX_FILE_BYTES:
        result: dict | str = f"is larger than {MAX_FILE_BYTES // 1024} KB, too long for a skill"
    else:
        try:
            text = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError) as exc:
            result = f"could not be read as UTF-8 text ({exc})"
        else:
            try:
                result = skills.normalise(parse(text, path.stem), known_tools)
            except skills.SkillError as exc:
                result = str(exc)
    with _lock:
        _cache[key] = (stamp, result)
    return result


def scan(config, known_tools: set[str] | None = None) -> tuple[list[dict], list[dict]]:
    """Every skill file that loads, and every one that did not with its reason.

    Returns `(skills, problems)`; each skill carries `folder: True` and the
    file's name, each problem is `{"file", "message"}`.
    """
    where = folder(config)
    if where is None:
        return [], []
    try:
        files = sorted(p for p in where.iterdir() if p.suffix.lower() == ".md" and p.is_file())
    except OSError:
        return [], []
    found: list[dict] = []
    problems: list[dict] = []
    for path in files[:MAX_FILES]:
        result = _load(path, known_tools)
        if isinstance(result, str):
            problems.append({"file": path.name, "message": result})
            continue
        found.append({**result, "folder": True, "file": path.name})
    if len(files) > MAX_FILES:
        problems.append(
            {"file": "", "message": f"only the first {MAX_FILES} files are read; there are {len(files)}"}
        )
    with _lock:
        live = {str(p) for p in files}
        for stale in [k for k in _cache if k not in live and Path(k).parent == where]:
            _cache.pop(stale, None)
    return found, problems
