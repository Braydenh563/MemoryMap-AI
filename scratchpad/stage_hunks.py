"""Stage only the hunks of a file whose text matches a pattern.

Six writers share one checkout here, so `git add <file>` on anything shared
(the changelog, a plan, index.html) sweeps in whatever another agent had
half-written in the same file. This stages the hunks that match a pattern and
leaves the rest of the file alone, which is what makes a commit "mine" rather
than "everything that happened to be on disk".

    python3 scratchpad/stage_hunks.py CHANGELOG.md 'the minimap gets out of'

Honours GIT_INDEX_FILE, so it stages into whatever private index the caller
set up; `scratchpad/safe_commit.sh` drives it that way for every `path::regex`
spec it is given.
"""

import re
import subprocess
import sys

path, pattern = sys.argv[1], re.compile(sys.argv[2])
diff = subprocess.run(
    ["git", "diff", "--", path], capture_output=True, text=True, check=False
).stdout
head, *hunks = re.split(r"(?m)^(?=@@ )", diff)
keep = [hunk for hunk in hunks if pattern.search(hunk)]
if not keep:
    sys.exit(f"no hunk in {path} matches {pattern.pattern}")
# `--recount` because the kept hunks no longer add up to the header's line
# counts once the others are dropped, and git is stricter about that than the
# patch it produced itself.
applied = subprocess.run(
    ["git", "apply", "--cached", "--recount", "-"],
    input=head + "".join(keep),
    text=True,
    capture_output=True,
    check=False,
)
print(applied.stderr or f"staged {len(keep)}/{len(hunks)} hunk(s) of {path}")
sys.exit(applied.returncode)
