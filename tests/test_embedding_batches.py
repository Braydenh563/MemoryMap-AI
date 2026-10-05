"""The backfill and the re-index embed notes in batches, not one at a time
(BACKLOG section 11, "Batch embeddings": the backfill embeds one note at a time).

`EmbeddingService.embed_many` already encodes a list in one call where the
backend has a batched encode (sentence-transformers), but the two loops that
embed a whole notebook (`backfill_missing` at startup, the Settings re-index)
still called `store_for_entry` per note, so the batch path was only ever used
for the paragraphs of one note. These tests count the calls: a notebook of N
notes costs ceil(N / EMBED_BATCH) batched encodes, and the stored vectors are
exactly what the one-at-a-time path stores.
"""

from __future__ import annotations

import numpy as np
from sqlalchemy import select

from memorymap.ai import embeddings
from memorymap.core.database import EmbeddingRecord
from tests.fakes import FakeEmbeddingService


class CountingEmbeddings(FakeEmbeddingService):
    """Records the size of every `embed_many` call and every single `embed_text`."""

    def __init__(self) -> None:
        super().__init__(available=True)
        self.batch_sizes: list[int] = []
        self.single_calls = 0

    def embed_text(self, text):  # noqa: ANN001
        self.single_calls += 1
        return super().embed_text(text)

    def embed_many(self, texts):  # noqa: ANN001
        self.batch_sizes.append(len(texts))
        # A batch is one encode, not N single ones: do not route through
        # `embed_text`, so `single_calls` stays a measure of the slow path.
        return [FakeEmbeddingService.embed_text(self, text) for text in texts]


def _factory(session):
    return lambda: session


def _vectors(session):
    return {
        row.entry_id: np.frombuffer(row.embedding, dtype="float32").tolist()
        for row in session.scalars(select(EmbeddingRecord))
    }


def _drop_vectors(session):
    session.query(EmbeddingRecord).delete()
    session.commit()


def test_backfill_embeds_a_notebook_in_batches(client, session, fake_embeddings):
    from memorymap.core import deps

    for i in range(7):
        client.post("/entries", json={"content": f"note number {i}"})
    _drop_vectors(session)

    counting = CountingEmbeddings()
    deps.override_ai(embeddings=counting)
    fixed = embeddings.backfill_missing(counting, _factory(session))

    assert fixed == 7
    assert sum(counting.batch_sizes) == 7
    # One call for seven notes, under the batch ceiling, never seven calls.
    assert len(counting.batch_sizes) == 1
    assert max(counting.batch_sizes) <= embeddings.EMBED_BATCH
    assert counting.single_calls == 0


def test_a_batch_never_exceeds_the_ceiling(client, session, fake_embeddings, monkeypatch):
    from memorymap.core import deps

    monkeypatch.setattr(embeddings, "EMBED_BATCH", 3)
    for i in range(7):
        client.post("/entries", json={"content": f"note number {i}"})
    _drop_vectors(session)

    counting = CountingEmbeddings()
    deps.override_ai(embeddings=counting)
    assert embeddings.backfill_missing(counting, _factory(session)) == 7
    assert counting.batch_sizes == [3, 3, 1]


def test_batched_vectors_equal_one_at_a_time(client, session, fake_embeddings):
    from memorymap.core import deps

    for text in ("a recipe for soup", "meeting about the budget", "a poem about rain"):
        client.post("/entries", json={"content": text})
    expected = _vectors(session)
    assert expected
    _drop_vectors(session)

    counting = CountingEmbeddings()
    deps.override_ai(embeddings=counting)
    embeddings.backfill_missing(counting, _factory(session))

    assert _vectors(session) == expected


def test_one_note_the_backend_cannot_embed_does_not_sink_its_batch(
    client, session, fake_embeddings
):
    from memorymap.core import deps

    for text in ("alpha note", "beta note", "gamma note"):
        client.post("/entries", json={"content": text})
    _drop_vectors(session)

    class Flaky(CountingEmbeddings):
        def embed_many(self, texts):  # noqa: ANN001
            self.batch_sizes.append(len(texts))
            vectors = [FakeEmbeddingService.embed_text(self, text) for text in texts]
            vectors[1] = None  # the second text could not be embedded
            return vectors

    flaky = Flaky()
    deps.override_ai(embeddings=flaky)
    fixed = embeddings.backfill_missing(flaky, _factory(session))

    assert fixed == 2
    assert len(_vectors(session)) == 2


def test_private_notes_are_still_never_embedded(client, session, fake_embeddings):
    from memorymap.core import deps, vault

    vault.close()
    vault.create(session, "test-passphrase")
    session.commit()
    entry = client.post("/entries", json={"content": "a private thing"}).json()
    client.post(f"/entries/{entry['id']}/privacy", json={"private": True})
    _drop_vectors(session)

    counting = CountingEmbeddings()
    deps.override_ai(embeddings=counting)
    assert embeddings.backfill_missing(counting, _factory(session)) == 0
    assert counting.batch_sizes == []
    vault.close()
