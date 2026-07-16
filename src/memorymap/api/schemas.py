"""Pydantic request/response shapes shared by the API routes."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class EntryCreate(BaseModel):
    content: str = Field(min_length=1, description="The thought to store")
    tags: list[str] = Field(default_factory=list)


class EntryOut(BaseModel):
    id: int
    content: str
    category: str
    tags: list[str]
    ai_confidence: int
    created_at: datetime
