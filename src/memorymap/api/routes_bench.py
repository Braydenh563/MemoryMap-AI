"""`/models/bench`: run the model bench and read its report (I8, H3).

The bench itself is `ai/bench.py`. This is the door: one run at a time, on a
thread of its own (a forty-note run over two models is minutes, not a
request), stoppable, and its last report kept in the data folder so the
table is still there after a restart. "Use this one" is not a route of its
own: it is `POST /models/chat-model`, the same switch the model picker uses,
so the bench cannot apply a model differently from the way a person would.
"""

from __future__ import annotations

import json
import logging
import threading
import time
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from memorymap.ai import bench, facts
from memorymap.core import deps, jobruns, jobs
from memorymap.core.atomic_io import atomic_write_text

logger = logging.getLogger("memorymap.api.bench")

router = APIRouter(prefix="/models/bench", tags=["models"])

OFF = "The model bench is switched off. Turn it on in Settings, What it learned."
BUSY = "A bench is already running. Stop it or wait for it to finish."
NO_MODELS = "Pick at least one installed model to test."
NOT_RUNNING = "The model server isn't running. Start it and try again."


class BenchBody(BaseModel):
    models: list[str] = Field(min_length=1, max_length=8)
    size: int = Field(default=bench.DEFAULT_SIZE, ge=2, le=bench.MAX_SIZE)
    budget_minutes: int = Field(default=bench.DEFAULT_BUDGET_SECONDS // 60, ge=1, le=240)
    #: Run inside the request (tests, and a script that wants the answer).
    wait: bool = False


_lock = threading.Lock()
_state: dict = {"running": False, "progress": None, "started_at": None}
_stop = threading.Event()


def _report_path():  # noqa: ANN202
    return deps.get_config().data_dir / "bench.json"


def _last_report() -> dict | None:
    try:
        return json.loads(_report_path().read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def _run(models: list[str], size: int, budget_seconds: float) -> None:
    session = deps.get_db().session()
    try:
        with jobruns.job_run("model-bench") as job:
            report = bench.run(
                session, deps.get_ollama(), models, size=size, budget_seconds=budget_seconds,
                stop=_stop, on_progress=lambda p: _state.__setitem__("progress", p),
            )
            report["finished_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
            atomic_write_text(_report_path(), json.dumps(report, indent=1))
            best = report.get("recommended")
            job.result = (
                f"benched {len(report['models'])} model{'' if len(report['models']) == 1 else 's'}"
                + (f", best: {best}" if best else "")
                + (f" ({report['stopped']})" if report.get("stopped") else "")
            )
    except Exception:  # noqa: BLE001  # a crashed bench must clear the running flag
        logger.exception("bench: the run failed")
    finally:
        session.close()
        with _lock:
            _state.update(running=False, progress=None)


@router.post("")
def start(body: BenchBody) -> dict:
    config = deps.get_config()
    if not facts.enabled(config, "model_bench"):
        raise HTTPException(status_code=403, detail=OFF)
    provider = deps.get_ollama()
    if not provider.is_running():
        raise HTTPException(status_code=409, detail=NOT_RUNNING)
    from memorymap.api.routes_models import _installed_models, _name_matches

    installed = _installed_models(True)
    models = [m for m in dict.fromkeys(body.models) if _name_matches(m, installed)]
    if not models:
        raise HTTPException(status_code=400, detail=NO_MODELS)
    session = deps.get_db().session()
    try:
        available = len(bench._candidates(session))
    finally:
        session.close()
    if available < bench.MIN_NOTES:
        raise HTTPException(
            status_code=409,
            detail=f"The bench needs at least {bench.MIN_NOTES} filed notes to test on; this notebook has {available}.",
        )
    with _lock:
        if _state["running"]:
            raise HTTPException(status_code=409, detail=BUSY)
        _stop.clear()
        _state.update(running=True, progress=None, started_at=time.time(), models=models)
    args = (models, body.size, body.budget_minutes * 60)
    if body.wait:
        _run(*args)
    else:
        #: On the job pool's model lane, not a thread of its own: the bench
        #: loads the same models a caption or a filing job does, and the lane
        #: is what keeps two of them from loading at once.
        jobs.enqueue("bench", _run, *args, name="model bench")
    return {"started": True, "models": models}


@router.get("")
def state() -> dict:
    with _lock:
        snapshot = dict(_state)
    snapshot["report"] = _last_report()
    snapshot["enabled"] = facts.enabled(deps.get_config(), "model_bench")
    return snapshot


@router.post("/stop")
def stop() -> dict:
    _stop.set()
    return {"stopping": bool(_state["running"])}
