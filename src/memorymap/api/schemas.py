"""Pydantic request/response shapes shared by the API routes."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class EntryCreate(BaseModel):
    content: str = Field(min_length=1, description="The thought to store")
    tags: list[str] = Field(default_factory=list)
    # Guided mode (Phase 4): the user picks the category up front and
    # the AI janitor is skipped entirely.
    category: str | None = None


class EntryUpdate(BaseModel):
    """Manual override — only provided fields change."""

    content: str | None = Field(default=None, min_length=1)
    category: str | None = None
    tags: list[str] | None = None


class LinkOut(BaseModel):
    link_id: int
    entry_id: int  # the entry on the other end
    preview: str  # first few words of that entry


class EntryOut(BaseModel):
    id: int
    content: str
    category: str
    tags: list[str]
    ai_confidence: int
    access_count: int = 0
    created_at: datetime
    deleted_at: datetime | None = None  # set only in the recycle-bin view
    links: list[LinkOut] = Field(default_factory=list)
    # How this entry was filed — only present on the create response:
    # 'semantic-match' | 'llm' | 'user' | 'none'
    filed_by: str | None = None
