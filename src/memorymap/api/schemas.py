"""Pydantic request/response shapes shared by the API routes."""

from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field



class SpaceCreate(BaseModel):
    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    icon: str = Field(min_length=1, default="ph-circles-four")

class SpaceUpdate(BaseModel):
    name: str = Field(min_length=1)
    icon: str = Field(min_length=1)

class SpaceResponse(BaseModel):
    id: str
    name: str
    icon: str
    
    class Config:
        from_attributes = True

class EntryCreate(BaseModel):
    content: str = Field(min_length=1, description="The thought to store")
    tags: list[str] = Field(default_factory=list)
    # Guided mode (Phase 4): the user picks the category up front and
    # the AI janitor is skipped entirely.
    category: str | None = None
    # Train-of-thought (Wave B): continue an existing entry.
    parent_id: int | None = None
    # Documents this note belongs with, attached as it is saved. Asked for
    # directly: "a way to link documents to new notes I create in the capture
    # tab". Doing it on create rather than afterwards is the point — the
    # connection is obvious while you are writing and forgotten by the time
    # the note is in a list.
    document_ids: list[int] = Field(default_factory=list, max_length=10)


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
    reason: str | None = None  # why these are connected, if anyone said or it was deduced
    # 0..1, set only when `reason` above came from embedding similarity
    # rather than from a person or the AI saying it — see EntryLink.reason_confidence.
    reason_confidence: float | None = None


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


class DocumentRefOut(BaseModel):
    """Just enough of a document to name it and open it."""

    id: int
    title: str


class EntryDateOut(BaseModel):
    """A relative time phrase, and the date it resolved to.

    The phrase travels with the date on purpose: the resolution is a rule
    ("next Friday" = the Friday of next week), not a fact, and a reader can
    only disagree with it if both are visible.
    """

    phrase: str
    at: date
    precision: str = "day"


class EntryOut(BaseModel):
    id: int
    content: str
    # A note's own leading `# Heading`, if it wrote one — not a stored,
    # separately-edited field. Editing the title is editing that line, the
    # same as editing any other line of the note; there's no second field to
    # go out of sync with the content it's supposedly titling.
    title: str | None = None
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
    # Documents this note is attached to: [{"id": 3, "title": "Trip plan"}].
    documents: list["DocumentRefOut"] = Field(default_factory=list)
    # What the note's relative time phrases meant when it was written (§10A):
    # [{"phrase": "next friday", "at": "2026-08-07", "precision": "day"}].
    dates: list["EntryDateOut"] = Field(default_factory=list)
    # How this entry was filed — only present on the create response:
    # 'semantic-match' | 'llm' | 'user' | 'thread' | 'none'
    filed_by: str | None = None
    # Near-duplicate warning — only present on the create response.
    similar: SimilarOut | None = None
