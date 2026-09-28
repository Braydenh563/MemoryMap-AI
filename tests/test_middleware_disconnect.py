"""A request the browser abandoned is not a server error (security.py)."""

from __future__ import annotations

import asyncio

import pytest

from memorymap.core.security import _call_next_or_gone


class _Request:
    def __init__(self, gone: bool) -> None:
        self._gone = gone

    async def is_disconnected(self) -> bool:
        return self._gone


async def _no_response(_request):
    raise RuntimeError("No response returned.")


def test_an_abandoned_request_gets_an_empty_499():
    response = asyncio.run(_call_next_or_gone(_Request(gone=True), _no_response))
    assert response.status_code == 499


def test_a_missing_response_to_a_live_client_still_raises():
    with pytest.raises(RuntimeError):
        asyncio.run(_call_next_or_gone(_Request(gone=False), _no_response))
