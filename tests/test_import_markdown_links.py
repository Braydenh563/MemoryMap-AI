"""Settings, Data, Import files: links and a second import (found by the e2e
suite, tests-e2e/specs/import.spec.js, 2026-10-05).

Two files where one says `[[Binoculars]]` and the other is Binoculars.md came
in as two notes with no link between them: `/import/markdown` never ran
`sync_wiki_links`, so the Graph and the note's connections showed nothing
until each note happened to be saved again. And choosing the same files a
second time made a second copy of each, where the README promises that
"importing the same thing twice adds only what is new" and the folder
importer already kept that promise (SEC-10).
"""

from __future__ import annotations

from sqlalchemy import select

from memorymap.core.database import EntryLink


def _upload(client, files):
    return client.post(
        "/import/markdown",
        files=[("files", (name, text.encode(), "text/markdown")) for name, text in files],
    )


FILES = [
    ("Birdwatching.md", "# Birdwatching\n\nSaw a kestrel over the marsh. See [[Binoculars]].\n"),
    ("Binoculars.md", "# Binoculars\n\n8x42 for the kestrel season.\n"),
]


def test_a_wiki_link_between_imported_files_becomes_a_link(client, session):
    response = _upload(client, FILES)
    result = response.json()
    assert result["imported"] == 2
    bird, binoculars = result["ids"]
    links = session.scalars(
        select(EntryLink).where(EntryLink.source_entry_id == bird, EntryLink.target_entry_id == binoculars)
    ).all()
    assert links, "[[Binoculars]] in an imported file did not link to Binoculars.md"


def test_importing_the_same_files_again_adds_nothing(client):
    first = _upload(client, FILES).json()
    assert first["imported"] == 2
    again = _upload(client, FILES).json()
    assert again["imported"] == 0
    assert again["already"] == 2
    notes = client.get("/entries?limit=50").json()
    assert sum(1 for n in notes if n["content"].startswith("# Birdwatching")) == 1


def test_an_edited_file_imports_again(client):
    """Passed over only when the text is the same: a file edited since comes
    in, the folder importer's rule."""
    _upload(client, FILES)
    edited = [("Birdwatching.md", FILES[0][1] + "\nAnd a heron.\n")]
    assert _upload(client, edited).json()["imported"] == 1
