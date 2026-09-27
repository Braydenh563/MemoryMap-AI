"""`GET /files/gallery` is read page by page, so its default can be a page.

WORLD_CLASS_PLAN "Placed from INBOX, 2026-09-13" (F2's frontend half, INBOX
195): the endpoint took a `limit` and sent `X-Total-Count`, but its default
stayed at its maximum (1000) because five callers read it whole through
`apiJson`, one of them the Library's own Files sub-tab, and a 200-row default
under them would have cut the Library off at two hundred attachments with
nothing on screen to say so. The callers now read to the end through
`apiPagedList`; this file is what keeps a sixth from reading one page and
believing it is the whole.
"""

from __future__ import annotations

import re
from pathlib import Path

FRONTEND = Path(__file__).resolve().parent.parent / "frontend"


def test_no_caller_reads_the_gallery_as_one_response() -> None:
    offenders = []
    for path in sorted(FRONTEND.glob("*.js")):
        for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if re.search(r'apiJson\(\s*"/files/gallery', line):
                offenders.append(f"{path.name}:{number}: {line.strip()}")
    assert offenders == [], (
        "read /files/gallery with apiPagedList(path, 200) so a notebook over "
        "one page is read to the end:\n" + "\n".join(offenders)
    )


def test_the_default_page_is_a_page(client) -> None:
    from memorymap.api import routes_files

    assert routes_files.GALLERY_PAGE_SIZE == 200
    response = client.get("/files/gallery")
    assert response.status_code == 200
    assert "X-Total-Count" in response.headers
