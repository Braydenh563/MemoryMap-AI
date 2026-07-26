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
    # Train-of-thought (Wave B): continue an existing entry.
    parent_id: int | None = None


class EntryUpdate(BaseModel):
    """Manual override — only provided fields change."""

    content: str | None = Field(default=None, min_length=1)
    category: str | None = None
    tags: list[str] | None = None
    pinned: bool | None = None


class ContextBody(BaseModel):
    """Extra context appended to an existing note (Wave B)."""

    text: str = Field(min_length=1, max_length=10_000)


class LinkOut(BaseModel):
    link_id: int
    entry_id: int  # the entry on the other end
    preview: str  # first few words of that entry


class AttachmentOut(BaseModel):
    id: int
    filename: str
    size: int
    is_image: bool


class SimilarOut(BaseModel):
    """A near-duplicate spotted while saving (Wave B)."""

    id: int
    preview: str
    similarity: float


class EntryOut(BaseModel):
    id: int
    content: str
    category: str
    tags: list[str]
    ai_confidence: int
    access_count: int = 0
    parent_id: int | None = None
    pinned: bool = False
    user_filed: bool = False
    # Private notes are encrypted at rest and kept out of search and the AI.
    is_private: bool = False
    created_at: datetime
    deleted_at: datetime | None = None  # set only in the recycle-bin view
    links: list[LinkOut] = Field(default_factory=list)
    attachments: list[AttachmentOut] = Field(default_factory=list)
    # How this entry was filed — only present on the create response:
    # 'semantic-match' | 'llm' | 'user' | 'thread' | 'none'
    filed_by: str | None = None
    # Near-duplicate warning — only present on the create response.
    similar: SimilarOut | None = None
