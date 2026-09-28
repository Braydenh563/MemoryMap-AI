"""Night runs and `GET /night/latest` (WORLD_CLASS_PLAN 15, I1; row 5).

OPEN.md: "`POST /night/run` returns the counts a card would need; nothing
stores a run, so grouping facts by run needs the `night_runs` table the plan
names." Every pass now writes one `NightRun` row (when, what triggered it,
how much it read and spent, why it stopped) and stamps its facts with the
run's id, so the morning card can say "while you were away" about exactly
one pass, and the review list can page through what that pass found.
"""

from __future__ import annotations

from sqlalchemy import select

from memorymap.ai import facts
from memorymap.core.database import DerivedFact, NightRun

CLAIMS = (
    "The batch size should stay at 32. Should we move to 64? "
    "The launch is on the fourth. Who owns the rollback plan?"
)


def _entry(client, content: str) -> dict:
    return client.post("/entries", json={"content": content}).json()


def test_a_run_is_recorded_and_its_facts_carry_its_id(ai_client, fake_ollama, session):
    _entry(ai_client, CLAIMS)
    reply = ai_client.post("/night/run", json={"budget": 2000}).json()
    run = session.get(NightRun, reply["run_id"])
    assert run is not None
    assert run.trigger == "manual"
    assert (run.scanned, run.derived, run.tokens_spent, run.budget) == (
        reply["scanned"], reply["derived"], reply["tokens_spent"], 2000
    )
    assert run.stopped_reason == "done"
    assert run.started_at is not None and run.finished_at is not None
    rows = session.scalars(select(DerivedFact)).all()
    assert rows and {row.run_id for row in rows} == {run.id}
    assert run.counts == {"claim": 2, "question": 2}


def test_latest_is_the_card(ai_client, fake_ollama):
    note = _entry(ai_client, CLAIMS)
    ai_client.post("/night/run", json={"budget": 2000})
    card = ai_client.get("/night/latest").json()
    assert card["run"]["trigger"] == "manual"
    assert card["run"]["scanned"] == 1
    assert card["counts"] == {"claim": 2, "question": 2}
    samples = card["samples"]["question"]
    assert {s["text"] for s in samples} == {"Should we move to 64?", "Who owns the rollback plan?"}
    for sample in samples:
        start, end = sample["span"]
        assert CLAIMS[start:end] == sample["text"]
        assert sample["entry_id"] == note["id"]


def test_no_run_yet_is_an_answer_not_an_error(ai_client):
    card = ai_client.get("/night/latest").json()
    assert card == {"run": None, "counts": {}, "samples": {}, "previous": None}


def test_a_quiet_second_run_keeps_the_last_findings_in_view(ai_client, fake_ollama):
    """The morning after a night with nothing new must not blank the card:
    the empty run is the latest, and the last one that found something is
    named beside it."""
    _entry(ai_client, CLAIMS)
    first = ai_client.post("/night/run", json={"budget": 2000}).json()
    second = ai_client.post("/night/run", json={"budget": 2000}).json()
    assert second["scanned"] == 0 and second["derived"] == 0
    card = ai_client.get("/night/latest").json()
    assert card["run"]["id"] == second["run_id"]
    assert card["counts"] == {}
    assert card["previous"]["id"] == first["run_id"]
    assert card["previous"]["counts"] == {"claim": 2, "question": 2}


def test_a_deleted_fact_leaves_the_card_and_the_list(ai_client, fake_ollama):
    _entry(ai_client, CLAIMS)
    run_id = ai_client.post("/night/run", json={"budget": 2000}).json()["run_id"]
    listed = ai_client.get(f"/night/runs/{run_id}/facts?kind=question").json()
    assert listed["total"] == 2
    gone = listed["items"][0]["id"]
    deleted = ai_client.delete(f"/learned/{gone}")
    assert deleted.status_code in (200, 204)
    assert ai_client.get("/night/latest").json()["counts"]["question"] == 1
    after = ai_client.get(f"/night/runs/{run_id}/facts?kind=question").json()
    assert after["total"] == 1 and gone not in {item["id"] for item in after["items"]}


def test_a_note_made_private_takes_its_facts_off_the_card(ai_client, fake_ollama, session):
    from memorymap.core import vault

    vault.create(session, "a passphrase")
    session.commit()
    note = _entry(ai_client, CLAIMS)
    ai_client.post("/night/run", json={"budget": 2000})
    assert ai_client.post(f"/entries/{note['id']}/privacy", json={"private": True}).status_code == 200
    card = ai_client.get("/night/latest").json()
    assert card["counts"] == {}
    assert card["samples"] == {}


def test_the_review_list_pages(ai_client, fake_ollama):
    for i in range(3):
        _entry(ai_client, f"Should we ship version {i} now? Who decides on release {i}?")
    run_id = ai_client.post("/night/run", json={"budget": 10_000}).json()["run_id"]
    page = ai_client.get(f"/night/runs/{run_id}/facts?kind=question&limit=4&offset=0").json()
    assert page["total"] == 6 and len(page["items"]) == 4
    rest = ai_client.get(f"/night/runs/{run_id}/facts?kind=question&limit=4&offset=4").json()
    assert len(rest["items"]) == 2
    assert ai_client.get("/night/runs/999999/facts").status_code == 404


def test_a_budget_stop_is_recorded_on_the_run(ai_client, fake_ollama, session):
    for i in range(5):
        _entry(ai_client, f"Question {i}? Claim {i} is settled.")
    reply = ai_client.post("/night/run", json={"budget": facts.TOKENS_PER_NOTE * 2}).json()
    run = session.get(NightRun, reply["run_id"])
    assert run.stopped_reason == "budget"


def test_a_paused_runner_writes_no_run(ai_client, fake_ollama, session):
    ai_client.put("/learned/switches", json={"night_shift": False})
    assert ai_client.post("/night/run", json={"budget": 2000}).json() == {"paused": True}
    assert session.scalars(select(NightRun)).all() == []


def test_forgetting_what_it_learned_forgets_the_runs(ai_client, fake_ollama, session):
    _entry(ai_client, CLAIMS)
    ai_client.post("/night/run", json={"budget": 2000})
    with session.begin_nested():
        facts.forget(session)
    session.commit()
    assert session.scalars(select(NightRun)).all() == []
    assert ai_client.get("/night/latest").json()["run"] is None


def test_the_scheduled_pass_says_so(session, app_state):
    run = facts.run(session, budget=2000, config=app_state, trigger="scheduled")
    session.commit()
    assert session.get(NightRun, run["run_id"]).trigger == "scheduled"
