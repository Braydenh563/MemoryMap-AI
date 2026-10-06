"""What a filing's certainty says when it is shown.

A small model's own "confidence" is not a probability. Found by running a
real 1.5B model end to end: a dentist appointment was filed under Work and
shown as "100% sure". The number says how the model phrases itself, not how
often it is right, so the number that is stored and shown is calibrated here
(the owner's decision, 2026-10-06: a model's raw number is never shown as is):

1. Nothing a model or a word match picks reads 100%: capped at `CAP`.
2. When the notebook's own words (`lexical_filing`, the same evidence the
   filing prompt carries) put their vote on another category, the model's
   number is lowered, down to 45% of itself when the words are unanimous the
   other way, which is under the review line (`manager.REVIEW_CONFIDENCE`),
   so the note is flagged and offered alternatives.
3. A category the model picked that holds few notes is trusted less: a pick
   with nothing to compare against is a guess, however it is phrased.

The raw number is logged by the janitor's "filed by" line for diagnostics and
not kept in a column: the calibration is applied once, where the filing is
decided, so every surface (the chip, the review queue, the composer's line)
reads the one number. A filing the person made is never a percentage: the
UI keys on `user_filed`, and `shown` leaves that case alone.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from memorymap.ai import lexical_filing

#: The most any model or word-match pick can read as.
CAP = 95
#: The words are said to agree when they hold at least this share of the vote
#: for the model's category; below it the number falls linearly.
AGREE_SHARE = 0.5
#: What is left of the number when the words put none of the vote on it.
DISAGREE_FLOOR = 0.45
#: A category with fewer notes than this is trusted less.
ESTABLISHED_NOTES = 5
#: What is left for a category with no notes at all (one the model invented),
#: rising by `SMALL_STEP` per note up to `ESTABLISHED_NOTES`.
EMPTY_CATEGORY = 0.7
SMALL_STEP = 0.06


def calibrate(raw: int, method: str, *, support: float | None, category_notes: int) -> int:
    """The number to store and show. `support` and `category_notes` are
    `lexical_filing.category_support`; only a model's pick is lowered by
    them, since the other methods already rest on that same evidence."""
    if raw <= 0:
        return 0
    value = float(min(int(raw), CAP))
    if method == "llm":
        if support is not None and support < AGREE_SHARE:
            value *= DISAGREE_FLOOR + (1.0 - DISAGREE_FLOOR) * (support / AGREE_SHARE)
        if category_notes < ESTABLISHED_NOTES:
            value *= EMPTY_CATEGORY + SMALL_STEP * max(0, category_notes)
    return max(1, round(value))


def calibrated(
    session: Session,
    content: str,
    category: str,
    raw: int,
    method: str,
    exclude_entry_id: int | None = None,
) -> int:
    """`calibrate` with the evidence read from the notebook."""
    if raw <= 0 or method != "llm":
        return calibrate(raw, method, support=None, category_notes=ESTABLISHED_NOTES)
    try:
        support, notes = lexical_filing.category_support(
            session, content, category, exclude_entry_id=exclude_entry_id
        )
    except Exception:  # noqa: BLE001 - a calibration never fails a filing
        return calibrate(raw, method, support=None, category_notes=ESTABLISHED_NOTES)
    return calibrate(raw, method, support=support, category_notes=notes)


def shown(stored: int | None, *, user_filed: bool) -> int:
    """What an API response carries for a stored number: rows written before
    the calibration existed can hold 100, which a model or word match never
    earns. A person's own filing is left as stored (the UI says "filed by
    you" and shows no percentage)."""
    value = int(stored or 0)
    return value if user_filed else min(value, CAP)
