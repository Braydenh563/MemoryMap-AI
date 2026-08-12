from memorymap.core.deps import impersonate_workspace
import logging

from sqlalchemy import select

from memorymap.ai import model_manager, ollama_client, provider
from memorymap.core.database import Entry, EntryLink
from memorymap.entry import manager

logger = logging.getLogger("memorymap.ai.links")

def audit_vague_links(
    session, model: model_manager.ModelManager, ollama: ollama_client.OllamaClient, limit: int = 50
) -> int:
    """Finds links with vague or auto-deduced reasons and rewrites them.

    Finds links where the reason is manager.AUTO_REASON_TEXT or has a non-null
    reason_confidence (meaning it was guessed from embeddings), fetches both
    notes, and asks the LLM to deduce a concise, specific reason why they are
    connected.
    """
    stmt = (
        select(EntryLink)
        .where(
            (EntryLink.reason == manager.AUTO_REASON_TEXT)
            | (EntryLink.reason_confidence.is_not(None))
        )
        .limit(limit)
    )
    links = session.scalars(stmt).all()
    if not links:
        return 0

    updated_count = 0
    # Keep prompt focused on the relationship
    sys_prompt = (
        "You are an assistant organizing a user's knowledge base. "
        "The user has two notes that are conceptually linked. "
        "Write a concise reason (under 10 words) explaining exactly WHY they are related or linked. "
        "Do not use phrases like 'Both notes discuss' or 'They are related because'. "
        "Just state the connection directly, e.g., 'scheduling for uni and gym'."
    )

    for link in links:
        source = session.get(Entry, link.source_entry_id)
        target = session.get(Entry, link.target_entry_id)
        if not source or not target:
            continue

        prompt = f"Note 1:\n{source.content}\n\nNote 2:\n{target.content}\n\nReason for link:"
        try:
            better_reason = provider.run_prompt(
                model, ollama, prompt=prompt, system=sys_prompt, use_utility_model=True
            )
            better_reason = better_reason.strip().strip('"\'')
            if better_reason:
                manager.set_link_reason(session, link, better_reason)
                updated_count += 1
        except Exception as exc:
            logger.warning("Failed to audit link reason for link %s: %s", link.id, exc)

    return updated_count
