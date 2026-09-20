"""A document's frontmatter properties, read for the Library's filter.

DOCUMENTS_PLAN Phase 3 item 4's second clause, "searchable from the Library's
filter". The parse lives on the server for the same reason the plan's section
11 gives for backlinks: the browser holds every note but no other document's
*content*, because `_summary()` deliberately sends a preview. A client-side
read of the frontmatter would have found nothing at all in the list view.

The frontmatter model itself, the one the properties panel edits, is in
`frontend/documents.js` and is tested by `tests/test_doc_frontmatter.py`. This
one is narrower on purpose: it answers "which properties does this document
have, and with what values", never how to write one back, so it can be a
read-only parse that cannot damage anybody's text.
"""

from __future__ import annotations

from memorymap.core import docmeta


def test_no_frontmatter_is_no_properties():
    assert docmeta.properties("# A heading\n\nWords.\n") == {}
    assert docmeta.properties("") == {}
    #: Three dashes that are a horizontal rule rather than a fence: the only
    #: thing that makes them frontmatter is being the first line.
    assert docmeta.properties("Some words\n\n---\n\nmore\n") == {}


def test_an_unclosed_fence_is_not_frontmatter():
    """A document that opens with `---` and never closes it is a document
    whose whole body would otherwise be read as properties."""
    assert docmeta.properties("---\nstatus: draft\n\nand then prose forever\n") == {}


def test_scalars_inline_lists_and_block_lists():
    text = (
        "---\n"
        "status: draft\n"
        'author: "Ada Lovelace"\n'
        "tags: [analysis, engine]\n"
        "reviewers:\n"
        "  - ada\n"
        "  - charles\n"
        "---\n"
        "\n"
        "# Notes\n"
    )
    assert docmeta.properties(text) == {
        "status": ["draft"],
        "author": ["Ada Lovelace"],
        "tags": ["analysis", "engine"],
        "reviewers": ["ada", "charles"],
    }


def test_a_key_with_no_value_is_kept_with_no_values():
    """The key is the half the filter offers first, so a document that has
    `status:` and has not filled it in is still a document with a status
    property: it just matches no value."""
    assert docmeta.properties("---\nstatus:\n---\n") == {"status": []}


def test_a_line_it_does_not_understand_is_skipped_not_guessed():
    text = "---\nstatus: draft\nthis line has no colon\n---\n"
    assert docmeta.properties(text) == {"status": ["draft"]}


def test_values_are_capped_so_one_document_cannot_flood_the_filter():
    tags = ", ".join(f"t{i}" for i in range(200))
    found = docmeta.properties(f"---\ntags: [{tags}]\n---\n")
    assert len(found["tags"]) == docmeta.MAX_VALUES_PER_KEY


def test_keys_are_capped_too():
    lines = "".join(f"k{i}: v\n" for i in range(100))
    found = docmeta.properties(f"---\n{lines}---\n")
    assert len(found) == docmeta.MAX_KEYS


def test_a_closing_fence_far_down_the_page_is_not_a_header():
    """A document that opens with a horizontal rule and has another one four
    hundred lines later would otherwise have four hundred lines of prose read
    as properties."""
    body = "".join(f"line {i}\n" for i in range(docmeta.MAX_FENCE_LINES + 5))
    assert docmeta.properties(f"---\n{body}---\n") == {}


def test_the_list_payload_carries_the_properties(client):
    """The filter is client-side (the Library reads the list to the end
    already), so the properties have to ride along on the row rather than
    costing a request per document."""
    client.post(
        "/documents",
        json={
            "title": "With properties",
            "content": "---\nstatus: draft\ntags: [one, two]\n---\n\n# Body\n",
        },
    )
    client.post("/documents", json={"title": "Plain", "content": "# Body\n"})

    rows = client.get("/documents").json()
    listed = rows["items"] if isinstance(rows, dict) else rows
    by_title = {row["title"]: row for row in listed}
    assert by_title["With properties"]["properties"] == {
        "status": ["draft"],
        "tags": ["one", "two"],
    }
    assert by_title["Plain"]["properties"] == {}


def test_properties_follow_an_edit(client):
    made = client.post(
        "/documents", json={"title": "Edited", "content": "---\nstatus: draft\n---\n"}
    ).json()
    assert made["properties"] == {"status": ["draft"]}
    updated = client.put(
        f"/documents/{made['id']}", json={"content": "---\nstatus: done\n---\n"}
    ).json()
    assert updated["properties"] == {"status": ["done"]}
