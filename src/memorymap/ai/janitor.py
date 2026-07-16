"""The janitor: files a new thought into a category (LLM prompt #1).

Not a separate AI model — just a prompt to the active chat model plus a
cheap embedding shortcut (plan §2, resolution 2). Order of attempts:

1. Embedding vs. category centroids — free, no LLM call needed when the
   match is clear.
2. Borderline or unknown → ONE call to the chat model, JSON answer.
3. No AI available at all → 'Uncategorised' with confidence 0. Saving
   an entry must never fail because the AI is down (plan §4).
"""

from __future__ import annotations

import json
from dataclasses import dataclass

import numpy as np
from sqlalchemy import select
from sqlalchemy.orm import Session

from memorymap.ai.embeddings import EmbeddingService, bytes_to_vector, cosine_similarity
from memorymap.ai.model_manager import ModelManager
from memorymap.ai.ollama_client import OllamaClient, OllamaError
from memorymap.core.database import Category, EmbeddingRecord, Entry
from memorymap.entry.manager import UNCATEGORISED

# Above this cosine similarity we trust the embedding match and skip
# the LLM entirely. Below it, the call is worth its cost.
CONFIDENT_MATCH = 0.60

SYSTEM_PROMPT = (
    "You are the filing assistant of a personal notebook. Given a note, "
    "choose the single best category for it. Prefer one of the existing "
    "categories; invent a short new category name (1-3 words) only if none "
    'fit. Reply with ONLY JSON like {"category": "...", "confidence": 0-100} '
    "where confidence is how sure you are."
)


@dataclass
class CentroidMatch:
    name: str
    similarity: float


def categorise(
    session: Session,
    content: str,
    embeddings: EmbeddingService,
    model_manager: ModelManager,
    ollama: OllamaClient,
) -> tuple[str, int, str]:
    """Decide (category_name, confidence 0-100, method) for a new note.

    `method` tells the UI how the decision was made: 'semantic-match'
    (embedding centroid, no LLM), 'llm' (asked the chat model), or
    'none' (no AI available)."""
    match = _best_centroid_match(session, content, embeddings)
    if match is not None and match.similarity >= CONFIDENT_MATCH:
        return match.name, min(100, round(match.similarity * 100)), "semantic-match"
    return _ask_llm(session, content, model_manager, ollama)


def _best_centroid_match(
    session: Session, content: str, embeddings: EmbeddingService
) -> CentroidMatch | None:
    """Compare the note's vector to the average vector (centroid) of each
    existing category. Only vectors from the current backend count."""
    note_vector = embeddings.embed_text(content)
    if note_vector is None:
        return None

    rows = session.execute(
        select(Category.name, EmbeddingRecord.embedding)
        .join(Entry, Entry.category_id == Category.id)
        .join(EmbeddingRecord, EmbeddingRecord.entry_id == Entry.id)
        .where(
            Entry.is_deleted == False,  # noqa: E712
            EmbeddingRecord.model_version == embeddings.backend_id(),
            Category.name != UNCATEGORISED,  # never gravitate INTO the junk drawer
        )
    ).all()
    if not rows:
        return None

    vectors_by_category: dict[str, list[np.ndarray]] = {}
    for name, blob in rows:
        vectors_by_category.setdefault(name, []).append(bytes_to_vector(blob))

    best: CentroidMatch | None = None
    for name, vectors in vectors_by_category.items():
        centroid = np.mean(vectors, axis=0)
        similarity = cosine_similarity(note_vector, centroid)
        if best is None or similarity > best.similarity:
            best = CentroidMatch(name=name, similarity=similarity)
    return best


def _ask_llm(
    session: Session,
    content: str,
    model_manager: ModelManager,
    ollama: OllamaClient,
) -> tuple[str, int, str]:
    if not ollama.is_running():
        return UNCATEGORISED, 0, "none"

    existing = [
        name
        for name in session.scalars(select(Category.name))
        if name != UNCATEGORISED
    ]
    user_prompt = (
        f"Existing categories: {', '.join(existing) if existing else '(none yet)'}\n"
        f"Note: {content}"
    )
    try:
        reply = ollama.chat(
            model_manager.chat_model(),
            [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
        )
        # Thinking models reason before answering; only the answer part
        # can contain the JSON we asked for.
        data = _extract_json(reply["content"])
        category = str(data["category"]).strip()
        if not category:
            raise ValueError("empty category")
        confidence = int(data.get("confidence", 50))
        return category, max(0, min(100, confidence)), "llm"
    except (OllamaError, ValueError, KeyError, TypeError):
        # A confused model must never block a save.
        return UNCATEGORISED, 0, "none"


def _extract_json(text: str) -> dict:
    """Small models often wrap JSON in chatter — grab the {...} part."""
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end <= start:
        raise ValueError(f"no JSON object in reply: {text!r}")
    parsed = json.loads(text[start : end + 1])
    if not isinstance(parsed, dict):
        raise ValueError("reply JSON is not an object")
    return parsed
