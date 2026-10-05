"""The Settings re-index embeds in batches too (BACKLOG section 11), and keeps
working for an embedder that only knows the one-note method, which is the
contract `model_manager.Embedder` states and what other tests pass."""

from __future__ import annotations

from sqlalchemy import select

from memorymap.ai import embeddings, model_manager
from memorymap.core import deps
from memorymap.core.database import EmbeddingRecord
from tests.test_embedding_batches import CountingEmbeddings


def test_reindex_embeds_in_batches_and_counts_every_note(
    client, session, fake_embeddings, monkeypatch
):
    monkeypatch.setattr(embeddings, "EMBED_BATCH", 4)
    for i in range(10):
        client.post("/entries", json={"content": f"note number {i}"})

    counting = CountingEmbeddings()
    job = model_manager.Job(kind="reindex")
    model_manager._run_reindex(deps.get_db(), counting, job)

    assert job.status == "success"
    assert job.done == job.total == 10
    assert counting.batch_sizes == [4, 4, 2]
    assert counting.single_calls == 0
    assert len(list(session.scalars(select(EmbeddingRecord)))) == 10


def test_reindex_still_works_for_an_embedder_with_only_the_one_note_method(client):
    class OneAtATime:
        def __init__(self) -> None:
            self.calls = 0

        def backend_id(self) -> str:
            return "fake:one"

        def store_for_entry(self, session, entry) -> bool:  # noqa: ANN001
            self.calls += 1
            return True

    for text in ("one", "two", "three"):
        client.post("/entries", json={"content": text})
    stand_in = OneAtATime()
    job = model_manager.Job(kind="reindex")
    model_manager._run_reindex(deps.get_db(), stand_in, job)

    assert job.status == "success"
    assert stand_in.calls == 3
