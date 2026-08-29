"""Where OCR/captioning/vision-OCR actually get triggered for an upload.

Asked for directly, correcting this session's own earlier choice: "the OCR
shouldn't happen to staged files, only when they are actually saved as a
note, actually sent in a chat message, or uploaded directly to the
library." `POST /media/upload` is one shared endpoint behind every one of
those (the note composer, the chat composer, the document editor and the
Library's own "Upload images" button all post to it) — a staged image
picked in the note composer and then abandoned, or an image attached to a
chat draft that's deleted before sending, has no business paying for a
Tesseract pass and a vision-model round trip for something that may never
be kept.

So the trigger point moves from *upload* to *commit*: this module is
called from the moment something actually becomes permanent — a note or
document is saved with the image referenced in its content, a chat turn is
saved with the image in `image_media_ids`, a whiteboard image object is
placed on the board, or `POST /media/upload` itself is told the upload
*is* the commit (`direct=True`, the Library's own upload button).

Every trigger already guards its own repeat work — `caption_and_store`/
`vision_ocr_and_store` are write-once unless forced, and Tesseract is cheap
and local — so calling this on every save of a note that already has its
images processed is a fast no-op, not a growing cost.
"""

from __future__ import annotations

from pathlib import Path
from sqlalchemy.orm import Session

from memorymap.ai import captioning, vision_ocr
from memorymap.core import ocr
from memorymap.core.database import MediaUpload


def process_committed_upload(upload: MediaUpload, media_dir: Path) -> None:
    """Fire the three background readers for one upload that just became
    permanent. Never raises — a missing file or an unsupported suffix for
    one reader just means that reader has nothing to do, exactly as
    `POST /media/upload`'s own trigger calls always treated it.
    """
    path = media_dir / upload.filename
    suffix = Path(upload.filename).suffix.lower()
    if suffix in ocr.OCR_SUFFIXES:
        ocr.extract_in_background(upload.id, path)
    if suffix in captioning.CAPTION_SUFFIXES:
        captioning.caption_in_background(upload.id, path)
    if suffix in vision_ocr.VISION_OCR_SUFFIXES:
        vision_ocr.vision_ocr_in_background(upload.id, path)


def process_referenced_uploads(session: Session, media_dir: Path, text: str) -> None:
    """Every `/media/…` upload referenced in `text` (a note or document's
    own content) gets processed, keyed off filename — reuses
    `media_gc`'s own extraction pattern rather than a second regex, since
    "which uploads does this text reference" is exactly the question that
    module already answers for the orphan scan.
    """
    from memorymap.core import media_gc

    names = media_gc.referenced_names(text)
    if not names:
        return
    for upload in session.query(MediaUpload).filter(MediaUpload.filename.in_(names)):
        process_committed_upload(upload, media_dir)


def process_committed_upload_ids(session: Session, media_dir: Path, media_ids: list[int]) -> None:
    """Same as `process_referenced_uploads`, keyed off explicit ids — for
    a saved chat turn, which stores `image_media_ids` directly rather than
    `/media/…` text (TurnBody.image_media_ids's own docstring explains why:
    a conversation's own content is a question string, not markdown with
    an inline image reference)."""
    if not media_ids:
        return
    for upload in session.query(MediaUpload).filter(MediaUpload.id.in_(media_ids)):
        process_committed_upload(upload, media_dir)
