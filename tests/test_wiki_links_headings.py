"""[[Name]] links to a note that opens with `# Name`, and to one created after
the link was written (INBOX 517). Measured before: neither made a link."""
from memorymap.core import deps
from memorymap.core.database import EntryLink


def _links():
    s = deps.get_db().session()
    try:
        return {(link.source_entry_id, link.target_entry_id) for link in s.query(EntryLink).all()}
    finally:
        s.close()


def test_a_link_finds_a_note_named_by_its_heading(client):
    beta = client.post("/entries", json={"content": "# Beta\nhello", "category": "X"}).json()
    alpha = client.post("/entries", json={"content": "# Alpha\nsee [[Beta]]", "category": "X"}).json()
    assert (alpha["id"], beta["id"]) in _links()


def test_a_heading_that_only_contains_the_name_is_not_it(client):
    client.post("/entries", json={"content": "# My Beta plan\nx", "category": "X"})
    alpha = client.post("/entries", json={"content": "see [[Beta]]", "category": "X"}).json()
    assert not any(src == alpha["id"] for src, _ in _links())


def test_a_link_written_first_resolves_when_its_note_arrives(client):
    delta = client.post("/entries", json={"content": "# Delta\nsee [[Epsilon]]", "category": "X"}).json()
    assert not _links()
    eps = client.post("/entries", json={"content": "# Epsilon\nhi", "category": "X"}).json()
    assert (delta["id"], eps["id"]) in _links()


def test_renaming_a_note_into_the_name_resolves_it_too(client):
    delta = client.post("/entries", json={"content": "see [[Zeta]]", "category": "X"}).json()
    other = client.post("/entries", json={"content": "# Draft name\nhi", "category": "X"}).json()
    client.put(f"/entries/{other['id']}", json={"content": "# Zeta\nhi"})
    assert (delta["id"], other["id"]) in _links()
