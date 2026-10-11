"""File attachments on entries.

Bytes live in the uploads folder under a random name (no path traversal
possible); the original filename is kept only for downloads.
"""

from __future__ import annotations

import base64
import binascii
import os
import subprocess
import sys
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, Response

from memorymap.api import paging
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from memorymap.ai import captioning, docreader, vision_ocr
from memorymap.api.routes_entries import _existing_entry, _to_out
from memorymap.api.schemas import EntryOut
from memorymap.core import (
    deps,
    diskspace,
    docview,
    filejobs,
    media_gc,
    media_process,
    ocr,
    pdfpages,
    reading_bin,
)
from memorymap.core.database import Attachment, Entry, MediaUpload
from memorymap.core.deps import get_session
from memorymap.entry import manager
from memorymap.api.this_computer import this_computer_only
from memorymap.files.service import (
    _attachment_out, _attachment_size, _bin_file_reading, _checked_engine, _checked_reader,
    _clean_reading_fields, _describe_page, _embed_pattern, _existing_attachment, _exports_dir,
    _forget_page_read, _forget_regions, _local_text, _media_size, _media_upload_path,
    _page_read_count_map, _page_read_key, _page_read_text_map, _parse_page_spec,
    _pdf_regions_for, _read_page, _read_range, _read_region, _reader_model, _regions_for,
    _reindex_file, _remember_page_caption, _remember_page_read, _set_edited_reading,
    _stored_range, _stored_readings, _strip_embeds, _within_dir, _within_exports,
    APP_CAPTION_AUTHOR, AttachedFileTextOut, ATTACHMENT_SUFFIXES, AttachmentAnalyseBody,
    AttachmentGalleryOut, AttachmentRenameBody, CaptionBody, EXPORTS_DIRNAME,
    EXPORTS_LIST_LIMIT, FileTextIn, GALLERY_PAGE_SIZE, GALLERY_PAGE_SIZE_MAX, HTML_PREVIEW_CSP,
    logger, MAX_FILE_BYTES, MAX_RANGE_PAGES, MAX_SAVE_BYTES, MEDIA_PAGE_SIZE,
    MEDIA_PAGE_SIZE_MAX, MEDIA_SUFFIXES, MediaOrphansOut, MediaRenameBody, MediaUploadOut,
    OcrBody, OcrLanguageBody, OcrPageReadOut, OcrRangeReadOut, OcrReadersOut, OcrRegionReadOut,
    OcrRegionsOut, PdfInfoOut, READERS, ReadingBinnedOut, ReadingRestoredOut, safe_filename,
    SaveFileBody, VisionOcrBody,
)

#: Names other modules and the tests still import from here; they live in
#: `memorymap.files.service` now (Brief 61).
__all__ = [
    "router", "EXPORTS_DIRNAME", "MAX_RANGE_PAGES", "READERS", "_embed_pattern",
    "_parse_page_spec", "_remember_page_caption", "_remember_page_read",
]


router = APIRouter(tags=["files"])


# `/media/{filename}` and `/files/{attachment_id}` are the two routes an
# `<img src>` points at directly rather than something the frontend fetches
# with its own X-Auth-Token header, see `require_unlock_media`'s own
# docstring in routes_auth.py for why they need a separate router (a
# router-level dependency and a route-level one are additive, not an
# override, so the header-only gate on `router` can't be loosened per-route).
media_router = APIRouter(tags=["files"])


@router.post("/entries/{entry_id}/files", response_model=EntryOut, status_code=201)
def upload_file(
    entry_id: int, file: UploadFile, session: Session = Depends(get_session)
) -> EntryOut:
    entry = _existing_entry(session, entry_id)
    suffix = Path(file.filename or "file").suffix[:12].lower()
    if suffix not in ATTACHMENT_SUFFIXES:
        raise HTTPException(
            status_code=415,
            detail=(
                f"'{suffix or 'that file type'}' can't be attached. "
                "Images, PDFs, office documents, text and code files are supported, "
                "video and audio attachments aren't yet."
            ),
        )
    uploads_dir: Path = deps.get_config().uploads_dir
    # The folder is created at startup, but it only has to go missing once, 
    # a cleanup tool, a synced or unmounted data directory, a restore that
    # didn't include an empty folder, and every upload fails with a 500 and a
    # traceback instead of saving. Sketches are the usual casualty, since the
    # note saves first and only the drawing is lost.
    uploads_dir.mkdir(parents=True, exist_ok=True)

    # Random stored name, original extension kept for double-click opening.
    stored_name = f"{uuid.uuid4().hex}{suffix}"
    destination = uploads_dir / stored_name

    #: `partial_write`, because the 413 above was the only failure this
    #: write cleaned up after. Measured on a data dir filled to 100% (INBOX
    #: 266, item 6): the upload answered 507, correctly, and left a
    #: zero-byte file in `uploads/` that no database row pointed at and
    #: nothing would ever remove. On a disk with 30 MB left and a 40 MB file
    #: that is 30 MB of orphan, and the person is further from being able to
    #: save anything than before they started.
    size = 0
    with diskspace.partial_write(destination):
        with destination.open("wb") as out:
            while chunk := file.file.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_FILE_BYTES:
                    out.close()
                    destination.unlink(missing_ok=True)
                    raise HTTPException(status_code=413, detail="That file is larger than 50 MB.")
                out.write(chunk)

    attachment = manager.add_attachment(
        session,
        entry,
        filename=file.filename or stored_name,
        stored_name=stored_name,
        mime=file.content_type or "application/octet-stream",
        size=size,
    )
    #: **A document says what it is without being asked.** An image gets
    #: Tesseract and a caption on background threads the moment it lands; an
    #: attachment got neither, so every row in the Files sub-tab was a
    #: filename until somebody opened each one by hand, which is the "no bg
    #: process, nothing" half of the owner's report. `read_in_background`
    #: extracts the text locally and, where a model is running, writes a
    #: description of it. Fire and forget, so this response is not held.
    #:
    #: `getattr` because `add_attachment` has not always returned the row, and
    #: a missing return here must not turn an upload that worked into a 500.
    new_id = getattr(attachment, "id", None)
    if new_id is not None:
        docreader.read_in_background(new_id)
    return _to_out(session, entry)


@media_router.get("/files/{attachment_id}")
def download_file(attachment_id: int, session: Session = Depends(get_session)) -> FileResponse:
    attachment = _existing_attachment(session, attachment_id)
    path = deps.get_config().uploads_dir / attachment.stored_name
    if not path.is_file():
        raise HTTPException(status_code=404, detail="That file is no longer on disk.")
    #: **Never the type the uploader declared, unless it is a picture or a
    #: PDF** (SEC-11, security audit 2026-10-05). `script-src 'self'` covers
    #: every URL on this origin, and `Content-Disposition: attachment` stops a
    #: navigation but not a `<script src="/files/1">`, which a `.js` upload
    #: served as text/javascript would have run. The sandbox CSP and CORP
    #: make the response inert anywhere it is not simply downloaded; a PDF
    #: keeps the app's own policy, since Chrome's viewer will not open in a
    #: sandboxed response and a PDF runs no script in the page anyway.
    mime = (attachment.mime or "").split(";", 1)[0].strip().lower()
    if not (mime.startswith("image/") or mime == "application/pdf"):
        mime = "application/octet-stream"
    headers = {"Cross-Origin-Resource-Policy": "same-origin"}
    if mime != "application/pdf":
        headers["Content-Security-Policy"] = "sandbox; default-src 'none'; img-src 'self'; style-src 'unsafe-inline'"
    return FileResponse(path, filename=attachment.filename, media_type=mime, headers=headers)


@router.get("/files/readings")
def file_readings(
    source: str = Query(pattern="^(attachment|upload)$"),
    id: int = Query(ge=1),  # noqa: A002  # the file's id, named as the API names it
    session: Session = Depends(get_session),
) -> dict:
    """Every reading of one file in one shape (F10, `core/readings.py`): its
    caption, Tesseract's text, the vision model's reading and each page read
    in the OCR workspace, as `{kind, page, text, model, at}` rows, so one
    renderer draws all of them instead of three cards each knowing one column.
    A private note's attachment is not read out."""
    from memorymap.core import readings

    model = Attachment if source == "attachment" else MediaUpload
    row = session.get(model, id)
    if row is None:
        raise HTTPException(status_code=404, detail="That file could not be found.")
    if source == "attachment":
        owner = session.get(Entry, row.entry_id)
        if owner is None or owner.is_deleted or bool(getattr(owner, "is_private", False)):
            raise HTTPException(status_code=404, detail="That file could not be found.")
    return {"source": source, "id": id, "readings": readings.for_file(session, source, id)}


@router.get("/files/gallery", response_model=list[AttachmentGalleryOut])
def list_attachment_gallery(
    response: Response,
    limit: int = Query(default=GALLERY_PAGE_SIZE, ge=1, le=GALLERY_PAGE_SIZE_MAX),
    offset: int = Query(default=0, ge=0),
    cursor: str | None = paging.cursor_param(),
    session: Session = Depends(get_session),
) -> list[AttachmentGalleryOut]:
    """A page of the note-attached files the Library's gallery may show, the
    `Attachment` half of what `GET /media` (this file, `list_media`) already
    covers for `MediaUpload` rows. See `AttachmentGalleryOut` for why this is
    a separate, smaller shape rather than folded into that endpoint.

    Same privacy rule as the Library's own overview list (`_images()` in
    routes_library.py): a private note's attachment is as private as the
    note, so it is excluded here rather than shown in a browsing surface the
    note itself is hidden from. Workspace scoping comes for free from
    `Attachment`'s own `WorkspaceMixin`, the ambient session filter already
    applies before this query ever runs, the same as every other
    workspace-scoped read in this app.
    """
    offset = paging.start(cursor, offset)
    visible = (
        select(Attachment, Entry)
        .join(Entry, Attachment.entry_id == Entry.id)
        .where(
            Entry.is_deleted == False,  # noqa: E712
            Entry.is_private == False,  # noqa: E712
        )
    )
    # Paged for the reason `GET /media` beside it is (WORLD_CLASS_PLAN F2):
    # this used to be the whole table, and the table is one row per attached
    # file for the life of the notebook. `X-Total-Count` is the real size
    # whatever the page, and the id breaks a tie on `created_at` so two files
    # attached in the same second cannot swap places between pages and hide a
    # row.
    total = session.scalar(select(func.count()).select_from(visible.subquery())) or 0
    response.headers["X-Total-Count"] = str(total)
    paging.finish(response, offset, limit, total)
    rows = session.execute(
        visible.order_by(Attachment.created_at.desc(), Attachment.id.desc())
        .limit(limit)
        .offset(offset)
    ).all()
    ids = [attachment.id for attachment, _ in rows]
    page_text = _page_read_text_map("attachment", ids)
    pages_read = _page_read_count_map("attachment", ids)
    return [
        AttachmentGalleryOut(
            id=attachment.id,
            pages_read=pages_read.get(attachment.id, 0),
            url=f"/files/{attachment.id}",
            original_name=attachment.filename,
            mime=attachment.mime or "application/octet-stream",
            created_at=attachment.created_at.isoformat(),
            used_by=[{"kind": "note", "id": entry.id, "label": manager.plain_label(entry.content)}],
            caption=attachment.caption or "",
            caption_model=attachment.caption_model or "",
            caption_edited=bool(attachment.caption_edited),
            ocr_text=attachment.ocr_text or "",
            #: Falls back to the page-by-page reading -- see
            #: `_page_read_text_map` for why the two were not joined before.
            vision_ocr_text=attachment.vision_ocr_text or page_text.get(attachment.id, ""),
            vision_ocr_model=attachment.vision_ocr_model or "",
            has_pages=Path(attachment.filename).suffix.lower() == ".pdf" and pdfpages.available(),
            size_bytes=_attachment_size(session, attachment),
        )
        for attachment, entry in rows
    ]


@router.post("/files/{attachment_id}/analyse", response_model=AttachmentGalleryOut)
def analyse_attachment(
    attachment_id: int,
    body: AttachmentAnalyseBody,
    session: Session = Depends(get_session),
) -> AttachmentGalleryOut:
    """Read a note's attached file with the local models, or store a reading
    typed by hand.

    One endpoint for all three readings rather than three near-identical
    ones (the `/media` side grew that way and is three copies of the same
    twenty lines). The split that matters is not caption/ocr/vision, it is
    *image or document*: an image goes to Tesseract, a document goes through
    `docview` (the same extractor the file viewer already uses), and the
    vision path rasterises PDF pages so a scan with no text layer at all
    still has something a model can look at.
    """
    attachment = _existing_attachment(session, attachment_id)
    path = _within_dir(deps.get_config().uploads_dir, attachment.stored_name)
    suffix = Path(attachment.filename).suffix.lower()
    is_image = suffix in captioning.CAPTION_SUFFIXES

    if body.text is not None:
        stripped = body.text.strip() or None
        if body.kind == "caption":
            attachment.caption = stripped
            if stripped:
                attachment.caption_edited = True
            else:
                attachment.caption_model = None
                attachment.caption_edited = False
        elif body.kind == "ocr":
            attachment.ocr_text = stripped
        else:
            attachment.vision_ocr_text = stripped
            if not stripped:
                attachment.vision_ocr_model = None
        session.commit()
        if body.edited and body.kind in {"ocr", "vision"}:
            _set_edited_reading(
                _page_read_key(attachment.id, None),
                stripped,
                "tesseract" if body.kind == "ocr" else "vision",
            )
        else:
            _forget_regions(_page_read_key(attachment.id, None))
        return _attachment_out(session, attachment)

    if not path.is_file():
        raise HTTPException(status_code=404, detail="That file is no longer on disk.")

    if body.kind == "ocr":
        # Tesseract for a picture; this app's own document extractor for
        # everything else: a .docx or a text-layer PDF has real text in it
        # that no OCR pass should be guessing at.
        # Registered even though no model is involved: Tesseract on a long
        # scan is one of the slowest things this app does, and "is it working
        # or is it stuck" is the same question whether the work is a model or
        # a binary.
        choice = _checked_engine(body.engine) if is_image else ""
        if is_image and (reason := ocr.unavailable_reason(choice)):
            raise HTTPException(status_code=409, detail=reason)
        with filejobs.reading("ocr", attachment.id, attachment.filename):
            if is_image:
                text = _local_text(path, choice)
            else:
                # No `vision_reader` passed on purpose: this is the "read it
                # locally, no model" path, and the vision kind below is the one
                # that costs a model round trip. A scan with no text layer comes
                # back empty here, which is the honest answer and is exactly what
                # sends the reader to "Read with AI".
                text = docview.extract(path).text
        attachment.ocr_text = (text or "").strip() or None
        session.commit()
        _forget_regions(_page_read_key(attachment.id, None))
        return _attachment_out(session, attachment)

    #: **Describing a document needs no vision model, only its own text.**
    #: Reported on 2026-09-09: "the describe with ai button in the files tab
    #: doesnt work. it should be a button for generating a
    #: description/summary of the file from the readable and/or extractable
    #: content of the file." It refused with a 415 for everything that was
    #: not a picture or a PDF, and even a PDF went to a vision model, which
    #: most machines do not have installed.
    #:
    #: This branch sits above the vision-model checks deliberately: a .md, a
    #: .docx, a .csv or a text-layer PDF is described by the utility model
    #: that already writes tag suggestions, on a machine with no vision model
    #: at all. `ocr_text` first when it is there, since that is this file's
    #: reading as the reader has it (corrections included) rather than a
    #: second extraction that may disagree with what they can see.
    #:
    #: **`vision_ocr_text` was missing from this chain entirely.** Reported
    #: directly: a scan already read page by page with the AI document
    #: reader (fourteen pages stored here) still had "Describe with AI" call
    #: a vision model itself, on one raw page image, because this fallback
    #: only ever checked the Tesseract field and a fresh local extraction,
    #: never the field this exact reading is written to. Checked second,
    #: after `ocr_text`: Tesseract's own reading, when both exist, is the
    #: one already corrected by hand and shown as the file's own text; the
    #: AI reader's is the one likelier to exist at all for a scan, since it
    #: needs no separate OCR binary. `docview.extract` stays last of the
    #: three, since it is a *native* text layer and only a text-layer PDF or
    #: a `.docx`/`.csv`/etc. has one at all.
    #:
    #: A file whose text extraction comes back empty is a scan with nothing
    #: already read either, and falls through to the vision path below,
    #: which rasterises its first page. A file whose text is there but whose
    #: model had nothing to say stores nothing and says so: those are
    #: different answers and must not share a branch.
    if body.kind == "caption" and not is_image:
        if attachment.caption and not body.force:
            return _attachment_out(session, attachment)
        readable = (
            (attachment.ocr_text or "").strip()
            or (attachment.vision_ocr_text or "").strip()
            or (docview.extract(path).text or "").strip()
        )
        if readable:
            if not deps.get_ollama().is_running():
                raise HTTPException(status_code=409, detail="The AI model isn't running.")
            models = deps.get_model_manager()
            with filejobs.reading(
                "describe", attachment.id, attachment.filename, models.utility_model()
            ):
                described = captioning.describe_document(readable, models, deps.get_ollama())
            attachment.caption = described or None
            attachment.caption_model = models.utility_model() if described else None
            attachment.caption_edited = False
            session.commit()
            return _attachment_out(session, attachment)
        if suffix != ".pdf":
            raise HTTPException(
                status_code=415,
                detail="There is no readable text in this file to describe.",
            )

    # Both remaining kinds need a vision model.
    if not deps.get_ollama().is_running():
        raise HTTPException(status_code=409, detail="The AI model isn't running.")
    model = deps.get_model_manager().resolve_vision_model(deps.get_ollama())
    if not model:
        raise HTTPException(
            status_code=409,
            detail="No installed model can read images. Install or "
            "pick one in Settings → Models.",
        )
    ollama = deps.get_ollama()

    if body.kind == "caption":
        if attachment.caption and not body.force:
            return _attachment_out(session, attachment)
        # `pdf_vision_reader` returns the reader callable itself (docview's
        # `vision_reader` contract), not an object with a `.read`: calling
        # `.read(path)` on it was the reported 500 on "generate a caption" for
        # a PDF ("'function' object has no attribute 'read'").
        with filejobs.reading("describe", attachment.id, attachment.filename, model):
            text = (
                captioning.caption_text(path, model, ollama)
                if is_image
                else vision_ocr.pdf_vision_reader(model, ollama)(path)
            )
        attachment.caption = (text or "").strip() or None
        attachment.caption_model = model if attachment.caption else None
        attachment.caption_edited = False
    else:
        if attachment.vision_ocr_text and not body.force:
            return _attachment_out(session, attachment)
        # A PDF is rasterised page by page (`pdf_vision_reader`), which is
        # the whole point for a scan, where there is no text layer to read
        # and Tesseract has already found nothing.
        with filejobs.reading("vision", attachment.id, attachment.filename, model):
            text = (
                vision_ocr.vision_ocr_text(path, model, ollama)
                if is_image
                else vision_ocr.pdf_vision_reader(model, ollama)(path)
            )
        attachment.vision_ocr_text = (text or "").strip() or None
        attachment.vision_ocr_model = model if attachment.vision_ocr_text else None
        _forget_regions(_page_read_key(attachment.id, None), only_source="edited-")
    session.commit()
    return _attachment_out(session, attachment)


@router.get("/files/{attachment_id}/text", response_model=AttachedFileTextOut)
def attached_file_text(
    attachment_id: int, session: Session = Depends(get_session)
) -> AttachedFileTextOut:
    """An attached file's text, for reading it without leaving the app.

    Deliberately returns *text*, never the file. `download_file` above hands
    the browser the bytes with `Content-Disposition: attachment`, and
    `media_file` at the bottom of this module explains at length why serving
    anything new inline is the thing to avoid. A viewer built by widening
    either of those would inherit that problem once per file type; this one
    cannot, because what it sends has already stopped being a .docx.

    Read-only, and that is a property of the extraction rather than a missing
    feature: see `core/docview.py`'s module docstring. Editing an attached
    file's text would mean writing text back into a format it was never in.
    """
    attachment = _existing_attachment(session, attachment_id)
    path = deps.get_config().uploads_dir / attachment.stored_name
    # The scanned-PDF fallback, passed rather than omitted. `docview` has
    # always taken a `vision_reader` and this, its only caller, passed
    # nothing, so the whole path was wired and never once ran: exactly the
    # "features that never executed" shape CLAUDE.md warns about. It only does
    # any work for a PDF with no text layer, and only when the pdfpages extra
    # and a vision model are both present; every other file returns before it
    # is consulted.
    viewed = docview.extract(path, vision_reader=vision_ocr.pdf_reader_or_none())
    editable, edit_message = docview.editability(path, viewed)
    return AttachedFileTextOut(
        filename=attachment.filename,
        kind=viewed.kind,
        source=viewed.source,
        text=viewed.text,
        truncated=viewed.truncated,
        message=viewed.message,
        extra=viewed.extra,
        editable=editable,
        edit_message=edit_message,
    )


@router.put("/files/{attachment_id}/text", response_model=AttachedFileTextOut)
def save_attached_file_text(
    attachment_id: int, payload: FileTextIn, session: Session = Depends(get_session)
) -> AttachedFileTextOut:
    """Save an edited text file back over itself.

    **This does not widen the read-only rule above; it draws the line where
    the rule's own reason stops applying.** That reason is that extraction is
    one-way: text pulled out of a .docx is not a .docx. For a .md, a .txt, a
    .csv or a source file, "extraction" is `bytes.decode()`: the text *is* the
    file, and writing it back is lossless. `docview.editability` owns which is
    which, so this route and the viewer cannot disagree about it.

    Re-checked here rather than trusting the `editable` flag the GET returned:
    a client is not the authority on what may be overwritten, and the file can
    have been replaced between the two calls.
    """
    attachment = _existing_attachment(session, attachment_id)
    path = _within_dir(deps.get_config().uploads_dir, attachment.stored_name)
    viewed = docview.extract(path)
    editable, edit_message = docview.editability(path, viewed)
    if not editable:
        raise HTTPException(status_code=409, detail=edit_message)
    docview.write_text_file(path, payload.text)
    #: The row's `size` is what the Library shows beside the name, so it has to
    #: follow the file rather than stay at whatever was uploaded. Nothing here
    #: touches the semantic index: that indexes *notes*, and a file's text has
    #: never been in it, `search_files` reads the file itself.
    attachment.size = path.stat().st_size
    session.commit()
    saved = docview.extract(path)
    return AttachedFileTextOut(
        filename=attachment.filename,
        kind=saved.kind,
        source=saved.source,
        text=saved.text,
        truncated=saved.truncated,
        message=saved.message,
        editable=True,
    )


@router.get("/files/{attachment_id}/pdf-info", response_model=PdfInfoOut)
def attached_file_pdf_info(attachment_id: int, session: Session = Depends(get_session)) -> PdfInfoOut:
    """`media_pdf_info`'s sibling for a note's own attached PDF (the
    `Attachment` model, `uploads_dir`, a different file and a different
    table from a `/media/` upload, which is why this is a second endpoint
    rather than one that takes either id). See that docstring for why this
    exists apart from `attached_file_text` at all."""
    attachment = _existing_attachment(session, attachment_id)
    if Path(attachment.filename).suffix.lower() != ".pdf":
        raise HTTPException(status_code=422, detail="Not a PDF.")
    path = _within_dir(deps.get_config().uploads_dir, attachment.stored_name)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="That file is no longer on disk.")
    if not pdfpages.available():
        return PdfInfoOut(
            available=False,
            pages=0,
            message=(
                "Viewing PDF pages needs a small rasteriser: install "
                "“Read scanned PDFs” in Settings → Packages."
            ),
        )
    count = pdfpages.page_count(path)
    if count == 0:
        return PdfInfoOut(
            available=False,
            pages=0,
            message=(
                "This PDF couldn't be opened. It may be corrupted, "
                "password-protected, or saved in a way this app's reader "
                "doesn't support."
            ),
        )
    return PdfInfoOut(available=True, pages=count)


@media_router.get("/files/{attachment_id}/pdf-page/{index}")
def attached_file_pdf_page(attachment_id: int, index: int, session: Session = Depends(get_session)) -> Response:
    """`media_pdf_page`'s sibling for an attached PDF, see that docstring
    for why this is always a freshly rendered PNG, never the file's own
    bytes. On `media_router`, same reason: loaded via `mediaSrc()`-tokened
    `<img src>`, not `apiJson`."""
    attachment = _existing_attachment(session, attachment_id)
    if Path(attachment.filename).suffix.lower() != ".pdf":
        raise HTTPException(status_code=404, detail="Not a PDF.")
    path = _within_dir(deps.get_config().uploads_dir, attachment.stored_name)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="That file is no longer on disk.")
    png = pdfpages.render_page(path, index)
    if png is None:
        raise HTTPException(status_code=404, detail="That page doesn't exist.")
    return Response(content=png, media_type="image/png", headers={"Cache-Control": "private, max-age=3600"})


@media_router.get("/files/{attachment_id}/html-preview")
def attached_file_html_preview(
    attachment_id: int, session: Session = Depends(get_session)
) -> Response:
    """Render an attached .html file, for the viewer's preview pane.

    **This is the one exception to "nothing new is ever served inline", and it
    is narrow enough to state exactly.** `core/docview.py`'s docstring gives
    the rule and its reason: an inline viewer is a script host, and widening a
    file-serving endpoint's allowlist would inherit that problem once per type
    added. Here the response is `sandbox`ed with `script-src 'none'`, so it is
    the opposite of a script host, and it serves .html *only*, one suffix,
    checked below rather than by an allowlist that can be widened later.

    What is sent is the file's own text, read through `docview.extract`, the
    same clip and the same forgiving decode every other reader in the app
    gets, so a 40 MB file cannot be handed to the browser whole.

    On `media_router` because an `<iframe src>` is a declarative load and
    cannot attach a header: `require_unlock_media` is the gate that accepts
    the media cookie, the same way `<img src>` already does.
    """
    attachment = _existing_attachment(session, attachment_id)
    if Path(attachment.filename).suffix.lower() not in {".html", ".htm"}:
        raise HTTPException(status_code=404, detail="Not an HTML file.")
    path = _within_dir(deps.get_config().uploads_dir, attachment.stored_name)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="That file is no longer on disk.")
    viewed = docview.extract(path)
    return Response(
        content=viewed.text,
        media_type="text/html; charset=utf-8",
        headers={
            "Content-Security-Policy": HTML_PREVIEW_CSP,
            # The middleware `setdefault`s DENY; this is the one response in
            # the app that is *meant* to be framed, by the app itself.
            "X-Frame-Options": "SAMEORIGIN",
            # No sniffing past the type we declared, and no caching of one
            # notebook's file into another view.
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "private, no-store",
        },
    )


@router.delete("/files/{attachment_id}", response_model=EntryOut)
def delete_file(
    attachment_id: int,
    strip_references: bool = False,
    session: Session = Depends(get_session),
) -> EntryOut:
    """`strip_references` is `delete_media`'s flag on the other table, same
    reason, same default. An attached image can be embedded in the note it is
    attached to (`![](/files/12)`), and deleting the file used to leave that
    markdown behind forever."""
    attachment = _existing_attachment(session, attachment_id)
    entry = _existing_entry(session, attachment.entry_id)
    if strip_references:
        _strip_embeds(session, f"/files/{attachment.id}")
    manager.delete_attachment(session, attachment, deps.get_config().uploads_dir)
    return _to_out(session, entry)


@router.put("/files/{attachment_id}", response_model=EntryOut)
def rename_file(
    attachment_id: int, body: AttachmentRenameBody, session: Session = Depends(get_session)
) -> EntryOut:
    """Rename a file in the Library, the display name only, never the bytes.

    Mirrors `delete_file` above for the two checks that make this safe to
    expose per-item rather than globally:

    - `_existing_attachment` then `_existing_entry(attachment.entry_id)`, in
      that order, the same as `delete_file`. `Attachment` carries no
      workspace column of its own, its note does, so re-fetching the note
      through the same workspace-filtered query every other route uses is
      what makes an attachment in a workspace this request isn't in 404
      rather than quietly renaming across the boundary.
    - a private note's attachment is refused outright (403), matching the
      Library's own listing (`routes_library._images`), which already hides
      a private note's files from view entirely, renaming one from a
      surface that can't show it would be a hole the same shape as the ones
      CLAUDE.md's review section warns about: the guard here is new, but the
      boundary it enforces already exists elsewhere in the app.
    """
    attachment = _existing_attachment(session, attachment_id)
    entry = _existing_entry(session, attachment.entry_id)
    if entry.is_private:
        raise HTTPException(
            status_code=403,
            detail="This file is on a private note and can't be renamed until the note is readable.",
        )
    try:
        manager.rename_attachment(session, attachment, body.filename)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except FileExistsError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return _to_out(session, entry)


@router.post("/files/save")
def save_generated_file(body: SaveFileBody) -> dict:
    """Write a generated export next to the notes and say where it went."""
    try:
        data = base64.b64decode(body.content_base64, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise HTTPException(status_code=422, detail="That file couldn't be read.") from exc
    if len(data) > MAX_SAVE_BYTES:
        raise HTTPException(status_code=413, detail="That file is too large to save.")

    exports = _exports_dir()
    exports.mkdir(parents=True, exist_ok=True)
    name = safe_filename(body.filename)
    target = _within_exports(exports, name)
    # Never silently overwrite: two exports of the same chat on the same day
    # are two files someone may want to compare.
    if target.exists():
        stem, suffix = target.stem, target.suffix
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        target = _within_exports(exports, f"{stem}-{stamp}{suffix}")
    #: A half-written export is worse than no export: it lands in the folder
    #: Settings lists, under the name the person chose, and opens as a
    #: truncated file rather than as an obvious failure. `write_bytes`
    #: truncates first and fills after, so out of space leaves exactly that.
    with diskspace.partial_write(target):
        target.write_bytes(data)
    return {"path": str(target), "filename": target.name, "bytes": len(data)}


@router.get("/files/exports")
def list_exports(
    response: Response,
    limit: int = Query(EXPORTS_LIST_LIMIT, ge=1, le=500),
    offset: int = Query(0, ge=0),
    cursor: str | None = paging.cursor_param(),
) -> dict:
    """The exports folder, newest first, paged like every other growing list
    (`limit`/`offset`, `X-Total-Count` for the whole). Sorted on the raw mtime
    with the name as the tie-break: two files saved within one second, which
    CI's disks manage easily, would otherwise come back in either order."""
    offset = paging.start(cursor, offset)
    exports = _exports_dir()
    if not exports.is_dir():
        response.headers["X-Total-Count"] = "0"
        return {"path": str(exports), "files": []}
    rows = []
    for entry in exports.iterdir():
        if not entry.is_file() or entry.name.startswith("."):
            continue
        stat = entry.stat()
        rows.append(
            (
                stat.st_mtime,
                entry.name,
                {
                    "filename": entry.name,
                    "bytes": stat.st_size,
                    "modified_at": datetime.fromtimestamp(stat.st_mtime).isoformat(timespec="seconds"),
                },
            )
        )
    rows.sort(key=lambda row: (row[0], row[1]), reverse=True)
    response.headers["X-Total-Count"] = str(len(rows))
    paging.finish(response, offset, limit, len(rows))
    return {"path": str(exports), "files": [row[2] for row in rows[offset : offset + limit]]}


@router.get("/files/exports/{filename}")
def download_export(filename: str) -> FileResponse:
    """One exported file, as a download. `safe_filename` and `_within_exports`
    are the same two locks the write went through, in the same order."""
    exports = _exports_dir()
    target = _within_exports(exports, safe_filename(filename))
    if not target.is_file():
        raise HTTPException(status_code=404, detail="That export is no longer there.")
    return FileResponse(str(target), filename=target.name)


@router.post("/files/open-exports-folder", dependencies=[Depends(this_computer_only)])
def open_exports_folder() -> dict:
    """Reveal the exports folder in the OS file manager.

    Asked for directly ("I have to dig in the app data files to find and
    access them") after `save_generated_file` above started writing graph
    PNGs, chat exports and the like into `data_dir/exports` with only a
    toast naming the path, real, but no help finding it again later.
    Desktop only: a browser tab has no file manager to hand this to, and
    `webbrowser.open`-ing a `file://` URL from a server request a browser
    could also reach is a foothold a purely local desktop shell doesn't
    have to give a page.
    """
    if os.getenv("MEMORYMAP_DESKTOP") != "1":
        raise HTTPException(
            status_code=409, detail="Only the desktop app can open a file manager window."
        )
    exports = _exports_dir()
    exports.mkdir(parents=True, exist_ok=True)
    try:
        if sys.platform == "win32":
            # Safe even though the path can now be user-configured: passed as
            # a single argument, never through a shell, and _validated_export_dir
            # already refused anything that isn't a real, writable directory.
            os.startfile(exports)
        elif sys.platform == "darwin":
            # Popen, not run(): the launcher forks its own file-manager window
            # and normally returns at once, but this request must not hang
            # waiting on a GUI process either way, same reasoning as
            # `restart_in_console_mode` being fire-and-forget rather than
            # something this response waits on.
            subprocess.Popen(["open", str(exports)])
        else:
            subprocess.Popen(["xdg-open", str(exports)])
    except OSError as exc:
        logger.warning("couldn't open the exports folder", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Couldn't open the exports folder. You can find it at {exports}.",
        ) from exc
    return {"path": str(exports)}


@router.post("/media/upload")
def upload_media(
    file: UploadFile,
    direct: bool = Form(False),
    session: Session = Depends(get_session),
) -> dict:
    """General file/image upload for drag-and-drop in markdown (documents &
    notes), and for the Library's own direct "Upload images" button.

    `direct` distinguishes the two: a note, document or chat composer
    upload is *staged*: it may be discarded before ever being saved or
    sent, so nothing runs on it here (see `direct` below) and OCR/
    captioning/vision-OCR instead fire when whatever referenced it is
    actually committed (`core/media_process.py`, called from the note,
    document and conversation save routes). The Library's own upload
    button sends `direct=True`: there is no separate "save" step for it: 
    the upload itself *is* the commit, the third case named directly
    ("uploaded directly to the library").
    """
    media_dir = deps.get_config().data_dir / "media"
    media_dir.mkdir(parents=True, exist_ok=True)

    suffix = Path(file.filename or "file").suffix[:12].lower()
    if suffix not in MEDIA_SUFFIXES:
        raise HTTPException(
            status_code=415,
            detail=(
                "Only images and PDFs can be dropped in here. "
                "Use the note's attachments for anything else."
            ),
        )
    stored_name = f"{uuid.uuid4().hex}{suffix}"
    destination = media_dir / stored_name

    #: Same guard, same measured reason as the attachment upload above.
    size = 0
    with diskspace.partial_write(destination):
        with destination.open("wb") as out:
            while chunk := file.file.read(1024 * 1024):
                size += len(chunk)
                if size > MAX_FILE_BYTES:
                    out.close()
                    destination.unlink(missing_ok=True)
                    raise HTTPException(status_code=413, detail="That file is larger than 50 MB.")
                out.write(chunk)

    original_name = file.filename or stored_name
    # `size` was already counted above while streaming the upload to disk, 
    # storing it here means `GET /media` never has to `stat()` this file to
    # answer "how big is it" (PLAN.md §0 P6).
    upload = MediaUpload(
        filename=stored_name, original_name=original_name[:300], size_bytes=size
    )
    session.add(upload)
    session.commit()
    session.refresh(upload)
    # OCR, captioning and vision OCR (core/media_process.py) all run on a
    # background thread, never on this request, Tesseract alone can take a
    # second or two per image, and a vision-model round trip far longer.
    # Only fired here for `direct=True` (the Library's own upload button);
    # every staged upload gets processed later, at the moment it's actually
    # committed: see this function's own docstring and media_process.py's.
    if direct:
        media_process.process_committed_upload(upload, media_dir)
    # `id` lets a caller that changes its mind (the capture form's own
    # attachment chip, removable with a click) call DELETE /media/{id}
    # instead of just detaching the markdown reference and leaving the
    # file behind: asked for directly.
    return {"id": upload.id, "url": f"/media/{stored_name}", "filename": original_name}


@router.get("/media", response_model=list[MediaUploadOut])
def list_media(
    response: Response,
    limit: int = Query(default=MEDIA_PAGE_SIZE, ge=1, le=MEDIA_PAGE_SIZE_MAX),
    offset: int = Query(default=0, ge=0),
    cursor: str | None = paging.cursor_param(),
    session: Session = Depends(get_session),
) -> list[MediaUploadOut]:
    """A page of the uploads `/media/upload` has produced: asked for
    directly (a gallery for note-attached and whiteboard images alike).
    Newest first, the same convention the Library's own sort defaults to.

    Paged for the reason `GET /entries` is: one response used to be the
    whole table (300 uploads measured at 117.6 KB, growing with the table),
    which is a real risk for a local app that is supposed to degrade
    gracefully rather than stall. `X-Total-Count` is the real size whatever
    the page, and the id breaks a tie on `created_at` so two uploads made in
    the same second cannot swap places between pages and hide a row.
    """
    offset = paging.start(cursor, offset)
    total = session.scalar(select(func.count(MediaUpload.id))) or 0
    uploads = (
        session.query(MediaUpload)
        .order_by(MediaUpload.created_at.desc(), MediaUpload.id.desc())
        .limit(limit)
        .offset(offset)
        .all()
    )
    response.headers["X-Total-Count"] = str(total)
    paging.finish(response, offset, limit, total)
    # One scan for the whole gallery rather than one per file: `usage_map`
    # walks each table once and inverts the result, so this stays a single
    # pass no matter how many uploads there are.
    used, usage_incomplete = media_gc.usage_map(session)
    media_dir = deps.get_config().data_dir / "media"

    # PLAN.md §0 P6: `size_bytes` used to be `Path.stat()`'d here on *every*
    # row of *every* call, the disk hit this whole column exists to remove.
    # Uploads made after the column existed already carry it (see
    # `upload_media`); this backfills only the rows that predate it, NULL,
    # never 0, is what a pre-existing row reads as (the column's own
    # docstring): one `stat()` each, the only time each row ever pays it,
    # in a single commit rather than one write per row.
    unsized = [u for u in uploads if u.size_bytes is None]
    if unsized:
        for u in unsized:
            try:
                u.size_bytes = (media_dir / u.filename).stat().st_size
            except OSError:
                # A row whose file is gone still lists, the gallery has a
                # placeholder for exactly that, so this leaves size_bytes at
                # 0 rather than leaving it NULL (which would just retry the
                # same failing stat() on every future call) or raising.
                u.size_bytes = 0
        session.commit()

    media_page_text = _page_read_text_map("upload", [u.id for u in uploads])
    #: Asked once per page of the gallery: an import check, the same answer for
    #: every row (OPEN.md, "A Files row asks for a PDF first page that this
    #: sandbox cannot render": the tile used to guess from the name and 404).
    can_draw_pages = pdfpages.available()
    media_pages_read = _page_read_count_map("upload", [u.id for u in uploads])
    return [
        MediaUploadOut(
            id=u.id,
            pages_read=media_pages_read.get(u.id, 0),
            used_by=used.get(u.filename, []),
            usage_incomplete=usage_incomplete,
            size_bytes=u.size_bytes or 0,
            url=f"/media/{u.filename}",
            original_name=u.original_name,
            ocr_text=u.ocr_text or "",
            caption=u.caption or "",
            caption_model=u.caption_model or "",
            caption_edited=u.caption_edited,
            vision_ocr_text=u.vision_ocr_text or media_page_text.get(u.id, ""),
            vision_ocr_model=u.vision_ocr_model or "",
            created_at=u.created_at.isoformat() if u.created_at else "",
            has_pages=can_draw_pages and Path(u.filename).suffix.lower() == ".pdf",
        )
        for u in uploads
    ]


# Declared ahead of the `/media/{upload_id}` routes below: FastAPI compiles
# `{upload_id}` as a plain path segment and only rejects a non-integer value
# (like "orphans") when the handler runs, by which point an earlier-declared
# `/media/{upload_id}` would already have claimed the match and returned a
# 422 instead of ever reaching these.
@router.get("/media/orphans", response_model=MediaOrphansOut)
def list_orphaned_media(
    response: Response,
    limit: int = Query(default=MEDIA_PAGE_SIZE_MAX, ge=1, le=MEDIA_PAGE_SIZE_MAX),
    offset: int = Query(default=0, ge=0),
    cursor: str | None = paging.cursor_param(),
    session: Session = Depends(get_session),
) -> MediaOrphansOut:
    """Uploads no live note, document or whiteboard image object still
    points at (ROADMAP.md item 20a). A dry run: nothing is deleted here.

    `total` rather than a header, unlike the other paged lists here, because
    this one has a body of its own already and the number is the answer the
    screen actually shows ("42 files nothing points at"). The page bounds the
    response, not the check: `DELETE /media/orphans` still acts on every
    orphan it finds, because deleting a page at a time would mean the count
    on screen and the count deleted could never agree.
    """
    offset = paging.start(cursor, offset)
    orphans, skipped_private = media_gc.find_orphaned_media(session)
    paging.finish(response, offset, limit, len(orphans))
    return MediaOrphansOut(
        orphans=[
            MediaUploadOut(id=u.id, url=f"/media/{u.filename}", original_name=u.original_name)
            for u in orphans[offset : offset + limit]
        ],
        skipped_private=skipped_private,
        total=len(orphans),
    )


@router.delete("/media/orphans", response_model=MediaOrphansOut)
def clean_orphaned_media(session: Session = Depends(get_session)) -> MediaOrphansOut:
    """Deletes every currently-orphaned upload's file and tracking row.

    Refuses to delete anything (`skipped_private: true`, `deleted: 0`)
    while a locked private note leaves the check incomplete, see
    `media_gc`'s own docstring for why.
    """
    media_dir = deps.get_config().data_dir / "media"
    deleted, skipped_private = media_gc.delete_orphaned_media(session, media_dir)
    return MediaOrphansOut(
        orphans=[
            MediaUploadOut(
                id=row["id"], url=f"/media/{row['filename']}", original_name=row["original_name"]
            )
            for row in deleted
        ],
        skipped_private=skipped_private,
        deleted=len(deleted),
    )


# Declared ahead of `/media/{upload_id}` for the same reason `/media/orphans`
# above is: "meta" would otherwise be matched as an `{upload_id}` and 422 out
# before ever reaching this handler.
@router.get("/media/meta/{filename}", response_model=MediaUploadOut)
def media_meta(filename: str, session: Session = Depends(get_session)) -> MediaUploadOut:
    """Everything the app knows *about* one upload, looked up by its stored
    filename: which is the only identifier most of the app actually holds.

    Reported directly: the lightbox showed a caption, OCR text and the
    picture's own facts when opened from the Image Gallery and nothing at
    all anywhere else. The cause was not the lightbox, it was that
    `openLightbox` took this metadata as *arguments*, and of its nine
    callers only the gallery had a full `MediaUpload` row to pass. Every
    other one (a note's attachment, a chat image, a graph or dashboard
    thumbnail, a whiteboard object) has a `/media/<filename>` url and
    nothing else, so it passed a filename and a url and the panel below the
    picture stayed empty.

    Handing the lightbox a way to *ask* fixes it in one place instead of
    nine, and keeps working for any caller added later, which is the same
    reason `GET /media` exists rather than each surface keeping its own
    list. Keyed on filename rather than id precisely because a url is what
    those callers have.
    """
    upload = session.query(MediaUpload).filter(MediaUpload.filename == filename).first()
    if not upload:
        # A url can outlive its row: deleting an upload deliberately leaves
        # any note still pointing at it alone (see delete_media below), so a
        # miss here is an ordinary state, not a fault.
        raise HTTPException(status_code=404, detail="No upload by that name.")
    return MediaUploadOut(
        id=upload.id,
        url=f"/media/{upload.filename}",
        original_name=upload.original_name,
        ocr_text=upload.ocr_text or "",
        caption=upload.caption or "",
        caption_model=upload.caption_model or "",
        caption_edited=upload.caption_edited,
        vision_ocr_text=upload.vision_ocr_text or "",
        vision_ocr_model=upload.vision_ocr_model or "",
        created_at=upload.created_at.isoformat() if upload.created_at else "",
        size=_media_size(upload.filename),
    )


@router.get("/media/text/{filename}", response_model=AttachedFileTextOut)
def media_text(filename: str, session: Session = Depends(get_session)) -> AttachedFileTextOut:
    """One uploaded document's *text*, for reading it in the lightbox.

    Asked for directly: the lightbox should become "a sort of document
    preview… for viewing pdfs, word documents, spreadsheets, text files, code
    files etc but in a presentable way that isn't editable".

    Almost none of that is new work, and deliberately so, `docview.extract`
    and its whole format table already existed for **attachments**
    (`GET /files/{id}/text`), and it already returns the `kind`
    (markdown/code/plain) that says how to render and the `source` that says
    whether a human wrote the text or a vision model read it off a scan. The
    only thing missing was that uploads, which is what the Library and the
    lightbox actually hold, had no way to reach it. So this is the same
    extraction pointed at `media/` instead of `uploads/`.

    **There is no `PUT` beside this one, and that is not an oversight.** Its
    sibling `save_attached_file_text` exists because a note's attachment can
    be a .md, a .txt or a source file. A `/media/` upload cannot: `MEDIA_SUFFIXES`
    is images and PDF, so `editable` here is always False and a save route
    would be a feature that never ran once, the shape CLAUDE.md names. The
    flag and its message are still returned, so the viewer can say *why*
    rather than silently omitting Edit.

    Deliberately returns **text, never the file**, for the reason
    `read_file_text` above states at length and `media_file` at the bottom of
    this module explains: what this sends has already stopped being a .docx,
    so a viewer built on it cannot inherit the serve-it-inline problem once
    per file type. That is also why the preview is read-only, a property of
    the extraction, not a missing feature. Editing here would mean writing
    text back into a format it was never in.
    """
    upload = session.query(MediaUpload).filter(MediaUpload.filename == filename).first()
    if not upload:
        raise HTTPException(status_code=404, detail="No upload by that name.")
    path = deps.get_config().data_dir / "media" / upload.filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="That file is no longer on disk.")
    # Same scanned-PDF fallback the attachment viewer passes. It only does any
    # work for a PDF with no text layer, and only when the pdfpages extra and
    # a vision model are both present; every other file returns before it is
    # consulted.
    viewed = docview.extract(path, vision_reader=vision_ocr.pdf_reader_or_none())
    editable, edit_message = docview.editability(path, viewed)
    return AttachedFileTextOut(
        filename=upload.original_name,
        kind=viewed.kind,
        source=viewed.source,
        text=viewed.text,
        truncated=viewed.truncated,
        message=viewed.message,
        extra=viewed.extra,
        editable=editable,
        edit_message=edit_message,
    )


@router.get("/media/pdf-info/{filename}", response_model=PdfInfoOut)
def media_pdf_info(filename: str, session: Session = Depends(get_session)) -> PdfInfoOut:
    """Page count for `pdf_page` below to page through, deliberately its
    own round trip rather than folded into `media_text`'s response, so the
    lightbox can show real PDF pages **without ever calling `media_text` (and
    therefore without markitdown or a vision model in the loop at all)**.
    That split is the point: viewing a PDF like a PDF and *reading* it with
    AI are two different questions (`docview.py`'s module docstring answers
    the second one at length), and until now this app only had an answer for
    the second: a scanned lecture PDF got stuck on the AI extraction path
    with no way to just look at the pages, direct instruction: "pdfs and
    documents should be viewable, accessible and manageable without the ai,
    even if the ai cant read them."
    """
    if Path(filename).suffix.lower() != ".pdf":
        raise HTTPException(status_code=422, detail="Not a PDF.")
    _upload, path = _media_upload_path(session, filename)
    if not pdfpages.available():
        return PdfInfoOut(
            available=False,
            pages=0,
            message=(
                "Viewing PDF pages needs a small rasteriser: install "
                "“Read scanned PDFs” in Settings → Packages."
            ),
        )
    count = pdfpages.page_count(path)
    if count == 0:
        return PdfInfoOut(
            available=False,
            pages=0,
            message=(
                "This PDF couldn't be opened. It may be corrupted, "
                "password-protected, or saved in a way this app's reader "
                "doesn't support."
            ),
        )
    return PdfInfoOut(available=True, pages=count)


@media_router.get("/media/pdf-page/{filename}/{index}")
def media_pdf_page(filename: str, index: int, session: Session = Depends(get_session)) -> Response:
    """One page of an uploaded PDF, rasterised to a PNG, the actual pixels
    a `<img>` in the lightbox loads, one per page, so a PDF scrolls like a
    PDF. On `media_router` rather than `router`: this is loaded the same
    declarative way `/media/{filename}` already is (`mediaSrc()` in app.js
    appends the unlock token as a query param for exactly these routes,
    since a plain `<img src>` cannot carry a header), not fetched with
    `apiJson` the way `media_pdf_info` above is.

    Always a **freshly rendered PNG**, never the PDF's own bytes: the
    security reasoning `get_media`'s own docstring gives for refusing to
    serve a PDF inline (a script host, from a folder not guaranteed to hold
    only what this app wrote) does not apply to pixels this process drew
    itself. A rasterised page cannot carry a PDF action, an embedded script,
    or anything else a PDF's own structure can.
    """
    if Path(filename).suffix.lower() != ".pdf":
        raise HTTPException(status_code=404, detail="Not a PDF.")
    _upload, path = _media_upload_path(session, filename)
    png = pdfpages.render_page(path, index)
    if png is None:
        raise HTTPException(status_code=404, detail="That page doesn't exist.")
    # Regenerated on every request rather than cached to disk: ~20ms/page
    # (measured, pdfpages.py's own docstring) and this app has no existing
    # per-file render cache to hang a second one off. `Cache-Control`
    # still lets the *browser* avoid re-fetching a page it already has.
    return Response(content=png, media_type="image/png", headers={"Cache-Control": "private, max-age=3600"})


@router.delete("/media/{upload_id}")
def delete_media(
    upload_id: int,
    strip_references: bool = False,
    session: Session = Depends(get_session),
) -> dict:
    """Removes the file and its tracking row.

    `strip_references` also takes the `![...](...)` out of every note that
    embedded it: asked for after the placeholder shipped: a note that keeps
    pointing at a file you deleted is a note that renders "this image was
    removed" for the rest of its life. Off by default, because deleting a
    file and editing someone's notes are different acts and the second one
    has to be chosen: the caller asks, the UI offers it in the confirm.
    """
    upload = deps.get_or_404(session, MediaUpload, upload_id, "That upload could not be found.")
    media_dir = (deps.get_config().data_dir / "media").resolve()
    candidate = (media_dir / upload.filename).resolve()
    cleaned: list[int] = []
    if strip_references:
        #: Before the row goes: the url is built from `upload.filename`.
        cleaned = _strip_embeds(session, f"/media/{upload.filename}")
    if candidate.is_relative_to(media_dir):
        candidate.unlink(missing_ok=True)
    session.delete(upload)
    session.commit()
    return {"status": "ok", "cleaned_notes": cleaned}


@router.put("/media/{upload_id}", response_model=MediaUploadOut)
def rename_media(
    upload_id: int, body: MediaRenameBody, session: Session = Depends(get_session)
) -> MediaUploadOut:
    """Rename a Library image, the display name only.

    `original_name` is a label, exactly like `Attachment.filename`: the bytes
    live under `upload.filename`, a generated name, and nothing here touches
    the disk. So it goes through the same validator rather than a laxer one of
    its own: two "rename a file" endpoints in one module with two different
    ideas of what a filename may contain is how the strict one quietly stops
    being the rule.
    """
    upload = deps.get_or_404(session, MediaUpload, upload_id, "That upload could not be found.")
    try:
        upload.original_name = manager.validate_attachment_filename(body.original_name)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    session.commit()
    return MediaUploadOut(
        id=upload.id, url=f"/media/{upload.filename}", original_name=upload.original_name
    )


@router.post("/media/{upload_id}/caption", response_model=MediaUploadOut)
def caption_media(
    upload_id: int, body: CaptionBody = CaptionBody(), session: Session = Depends(get_session)
) -> MediaUploadOut:
    """Generate (or, with `force`, regenerate) a caption for one image, or, 
    with `text`, set one by hand. The manual-generate trigger and the
    manual-edit field are both reached from the Library and the Notes tab.

    Runs synchronously: captioning one image is a single model round trip,
    no different in shape from the AI-edit or link-reason calls this app
    already blocks on behind a spinner. `caption_and_store` opens its own
    session (the same shape `ocr.extract_and_store` uses from a background
    thread): `session.refresh` below picks up what it committed.
    """
    upload = deps.get_or_404(session, MediaUpload, upload_id, "That upload could not be found.")
    is_picture = Path(upload.filename).suffix.lower() in captioning.CAPTION_SUFFIXES
    if body.text is not None:
        # A hand-typed caption needs no model at all, set it and return,
        # skipping every Ollama/vision-model check below.
        stripped = body.text.strip() or None
        upload.caption = stripped
        if stripped and body.source == "app":
            upload.caption_model = APP_CAPTION_AUTHOR
            upload.caption_edited = False
        elif stripped:
            # `caption_model` is left as-is: if this text started as one
            # model's caption, the badge can still credit it alongside
            # "edited" instead of losing that history the moment someone
            # fixes a typo (see MediaUpload.caption_edited's docstring).
            upload.caption_edited = True
        else:
            # Cleared back to "no caption", a full reset, not a caption
            # with nothing to show for whichever model or person last wrote one.
            upload.caption_model = None
            upload.caption_edited = False
        session.commit()
    elif not is_picture:
        #: The same document describer the attachment route uses, for the
        #: rows that arrived through `/media/upload` rather than as a note's
        #: attachment: both kinds land in the same Files sub-tab, and a
        #: button that works on one of them and 415s on the other would be
        #: the same report again from the other side.
        if upload.caption and not body.force:
            pass
        else:
            if not deps.get_ollama().is_running():
                raise HTTPException(status_code=409, detail="The AI model isn't running.")
            media_dir = deps.get_config().data_dir / "media"
            path = _within_dir(media_dir, upload.filename)
            readable = (upload.ocr_text or "").strip() or (docview.extract(path).text or "").strip()
            if not readable:
                raise HTTPException(
                    status_code=415,
                    detail="There is no readable text in this file to describe.",
                )
            models = deps.get_model_manager()
            described = captioning.describe_document(readable, models, deps.get_ollama())
            upload.caption = described or None
            upload.caption_model = models.utility_model() if described else None
            upload.caption_edited = False
            session.commit()
    else:
        if not deps.get_ollama().is_running():
            raise HTTPException(status_code=409, detail="The AI model isn't running.")
        model = deps.get_model_manager().resolve_vision_model(deps.get_ollama())
        if not model:
            raise HTTPException(
                status_code=409,
                detail="No installed model can read images. Install or "
                "pick one in Settings → Models.",
            )
        media_dir = deps.get_config().data_dir / "media"
        captioning.caption_and_store(upload.id, media_dir / upload.filename, force=body.force)
        session.refresh(upload)
    return MediaUploadOut(
        id=upload.id,
        url=f"/media/{upload.filename}",
        original_name=upload.original_name,
        ocr_text=upload.ocr_text or "",
        caption=upload.caption or "",
        caption_model=upload.caption_model or "",
        caption_edited=upload.caption_edited,
        vision_ocr_text=upload.vision_ocr_text or "",
        vision_ocr_model=upload.vision_ocr_model or "",
    )


@router.post("/media/{upload_id}/ocr", response_model=MediaUploadOut)
def ocr_media(
    upload_id: int, body: OcrBody = OcrBody(), session: Session = Depends(get_session)
) -> MediaUploadOut:
    """Re-read one image with Tesseract, or, with `text`, set the
    extracted text by hand. The manual retry asked for directly: `ocr_text`
    otherwise only ever gets written once, automatically, at the moment the
    image is actually saved into a note/document/chat (`core/media_process.
    py`), this is the only way to try again (a first Tesseract pass that
    misread something, or ran before Tesseract was installed) or to correct
    what it found.

    `extract_text`/`extract_and_store` (core/ocr.py) have no write-once
    guard of their own, every call re-reads the image, which is exactly
    what "retry" needs, no `force` field required. Runs synchronously:
    local OCR is fast, and the frontend already blocks caption/vision-OCR
    regenerate behind a spinner the same way.
    """
    upload = deps.get_or_404(session, MediaUpload, upload_id, "That upload could not be found.")
    if Path(upload.filename).suffix.lower() not in ocr.OCR_SUFFIXES:
        raise HTTPException(status_code=415, detail="Only images can be read this way.")
    if body.text is not None:
        upload.ocr_text = body.text.strip() or None
        session.commit()
        if body.edited:
            _set_edited_reading(_page_read_key(None, upload.id), upload.ocr_text, "tesseract")
        else:
            _forget_regions(_page_read_key(None, upload.id))
    else:
        #: A missing engine used to come back as a 200 with no text, which the
        #: workspace painted as "Read <file>." over an empty panel. Say so.
        choice = _checked_engine(body.engine)
        reason = ocr.unavailable_reason(choice)
        if reason:
            raise HTTPException(status_code=409, detail=reason)
        media_dir = deps.get_config().data_dir / "media"
        #: **A person pressing Read again is the one case that must read.**
        #: This called `extract_and_store`, whose guards ("once per picture",
        #: "stand down when a vision model exists") are right for the
        #: background pass after an upload and wrong here: with a reading on
        #: the row, or a model running, "Read again" did nothing at all.
        text = _local_text(media_dir / upload.filename, choice)
        if text:
            upload.ocr_text = text
            session.commit()
            _forget_regions(_page_read_key(None, upload.id))
        session.refresh(upload)
    return MediaUploadOut(
        id=upload.id,
        url=f"/media/{upload.filename}",
        original_name=upload.original_name,
        ocr_text=upload.ocr_text or "",
        caption=upload.caption or "",
        caption_model=upload.caption_model or "",
        caption_edited=upload.caption_edited,
        vision_ocr_text=upload.vision_ocr_text or "",
        vision_ocr_model=upload.vision_ocr_model or "",
    )


@router.get("/media/{upload_id}/ocr-regions", response_model=OcrRegionsOut)
def media_ocr_regions(
    upload_id: int,
    page: int = 0,
    auto: bool = True,
    engine: str = "",
    session: Session = Depends(get_session),
) -> OcrRegionsOut:
    """The page, region by region, what the OCR workspace draws its boxes
    from. Asked for with three screenshots of Baidu's Unlimited-OCR: a page
    beside its regions, each separately readable, instead of one wall of
    text with no way to tell which part of the page a line came from."""
    upload = deps.get_or_404(session, MediaUpload, upload_id, "That upload could not be found.")
    suffix = Path(upload.filename).suffix.lower()
    if suffix not in ocr.OCR_SUFFIXES and suffix != ".pdf":
        raise HTTPException(status_code=415, detail="Only images and PDFs can be read this way.")
    path = _within_dir(deps.get_config().data_dir / "media", upload.filename)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="That file is no longer on disk.")
    stored = (upload.vision_ocr_text or upload.ocr_text or "")
    label = (
        f"Read by {upload.vision_ocr_model or 'a vision model'}"
        if upload.vision_ocr_text
        else "Text already extracted from this file"
    )
    key = _page_read_key(None, upload_id)
    if suffix == ".pdf":
        return _pdf_regions_for(path, page, stored, label, key, auto, _checked_engine(engine))
    #: An image is a one page document, and page 0 is where its regions go.
    out = _regions_for(path, stored, label, key, 0, auto, _checked_engine(engine))
    out.readings = _stored_readings(upload.vision_ocr_text, upload.vision_ocr_model, upload.ocr_text, out.source)
    return out


@router.get("/files/{attachment_id}/ocr-regions", response_model=OcrRegionsOut)
def attachment_ocr_regions(
    attachment_id: int,
    page: int = 0,
    auto: bool = True,
    engine: str = "",
    session: Session = Depends(get_session),
) -> OcrRegionsOut:
    """`media_ocr_regions`'s sibling for an attached file. Two tables, two
    routes: the same split every other file endpoint in this module has."""
    attachment = _existing_attachment(session, attachment_id)
    suffix = Path(attachment.filename).suffix.lower()
    if suffix not in ocr.OCR_SUFFIXES and suffix != ".pdf":
        raise HTTPException(status_code=415, detail="Only images and PDFs can be read this way.")
    path = _within_dir(deps.get_config().uploads_dir, attachment.stored_name)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="That file is no longer on disk.")
    stored = (attachment.vision_ocr_text or attachment.ocr_text or "")
    label = (
        f"Read by {attachment.vision_ocr_model or 'a vision model'}"
        if attachment.vision_ocr_text
        else "Text already extracted from this file"
    )
    key = _page_read_key(attachment_id, None)
    if suffix == ".pdf":
        return _pdf_regions_for(path, page, stored, label, key, auto, _checked_engine(engine))
    out = _regions_for(path, stored, label, key, 0, auto, _checked_engine(engine))
    out.readings = _stored_readings(
        attachment.vision_ocr_text, attachment.vision_ocr_model, attachment.ocr_text, out.source
    )
    return out


@router.get("/ocr-readers", response_model=OcrReadersOut)
def ocr_readers() -> OcrReadersOut:
    """What can read a page here, asked by the workspace's reader picker.

    Reported directly: "I can only select the vision models not OCR
    models." This called `resolve_vision_model`, the same, name-agnostic
    "can anything here see an image" resolver `/models/vision-model` uses: 
    so the picker always described whatever generic vision model
    auto-detect happened to find first, never the dedicated document
    reader (GLM-OCR/DeepSeek-OCR/PaddleOCR-VL) an explicit `ocr_model`
    preference names, even though the actual read (`routes_files.py`'s own
    page-read endpoint) already calls `resolve_ocr_model` and gets it
    right. The picker's own idea of "which model" just never matched what
    a read would actually use."""
    ollama = deps.get_ollama()
    running = ollama.is_running()
    model = _reader_model("vision") if running else ""
    other = _reader_model("ocr") if running else ""
    if not running:
        reason = "The AI model isn't running."
    elif not model:
        reason = "No installed model reports it can see images."
    else:
        reason = ""
    #: Only when it is a genuinely *different* model. On the common machine
    #: with one vision model both resolvers return it, and offering the same
    #: model twice under two names is a worse picker than offering it once.
    second = other if (other and other != model) else ""
    engine = ocr.engine_status()
    return OcrReadersOut(
        #: Ready, not merely "the program exists": a program with no Python
        #: wrapper offered as a reader fails on the first page.
        tesseract=engine["ready"],
        vision=bool(model),
        vision_model=model or "",
        vision_reason=reason,
        ocr=bool(second),
        ocr_model=second,
        ocr_reason="" if second else reason,
        engine=engine,
    )


@router.post("/ocr/language")
def set_ocr_language(body: OcrLanguageBody) -> dict:
    """Remember which language Tesseract reads in. One setting for every read
    (see `ocr.LANGUAGE_PREFERENCE`); the answer is the engine status, so the
    caller repaints from the truth rather than from what it sent."""
    try:
        ocr.set_language(body.language)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return ocr.engine_status()


@router.post("/files/{attachment_id}/ocr-range-read", response_model=OcrRangeReadOut)
def attachment_ocr_range_read(
    attachment_id: int,
    pages: str = "all",
    reader: str = "vision",
    session: Session = Depends(get_session),
) -> OcrRangeReadOut:
    """Read a whole PDF, or the pages named by `pages` (e.g. `1-5`, `2,7`)."""
    reader = _checked_reader(reader)
    attachment = _existing_attachment(session, attachment_id)
    if Path(attachment.filename).suffix.lower() != ".pdf":
        raise HTTPException(status_code=415, detail="Only PDFs are read by page range.")
    path = _within_dir(deps.get_config().uploads_dir, attachment.stored_name)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="That file is no longer on disk.")
    return _read_range(path, pages, reader, _page_read_key(attachment_id, None))


@router.post("/media/{upload_id}/ocr-range-read", response_model=OcrRangeReadOut)
def media_ocr_range_read(
    upload_id: int,
    pages: str = "all",
    reader: str = "vision",
    session: Session = Depends(get_session),
) -> OcrRangeReadOut:
    """Read a whole PDF, or the pages named by `pages` (e.g. `1-5`, `2,7`)."""
    reader = _checked_reader(reader)
    upload = deps.get_or_404(session, MediaUpload, upload_id, "That upload could not be found.")
    if Path(upload.filename).suffix.lower() != ".pdf":
        raise HTTPException(status_code=415, detail="Only PDFs are read by page range.")
    path = _within_dir(deps.get_config().data_dir / "media", upload.filename)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="That file is no longer on disk.")
    return _read_range(path, pages, reader, _page_read_key(None, upload_id))


@router.post("/files/{attachment_id}/ocr-page-read", response_model=OcrPageReadOut)
def attachment_ocr_page_read(
    attachment_id: int,
    page: int = 0,
    reader: str = "vision",
    session: Session = Depends(get_session),
) -> OcrPageReadOut:
    reader = _checked_reader(reader)
    attachment = _existing_attachment(session, attachment_id)
    if Path(attachment.filename).suffix.lower() != ".pdf":
        raise HTTPException(status_code=415, detail="Only PDF pages are read one at a time.")
    path = _within_dir(deps.get_config().uploads_dir, attachment.stored_name)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="That file is no longer on disk.")
    return _read_page(path, page, reader, _page_read_key(attachment_id, None))


@router.post("/media/{upload_id}/ocr-page-read", response_model=OcrPageReadOut)
def media_ocr_page_read(
    upload_id: int,
    page: int = 0,
    reader: str = "vision",
    session: Session = Depends(get_session),
) -> OcrPageReadOut:
    reader = _checked_reader(reader)
    upload = deps.get_or_404(session, MediaUpload, upload_id, "That upload could not be found.")
    if Path(upload.filename).suffix.lower() != ".pdf":
        raise HTTPException(status_code=415, detail="Only PDF pages are read one at a time.")
    path = _within_dir(deps.get_config().data_dir / "media", upload.filename)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="That file is no longer on disk.")
    return _read_page(path, page, reader, _page_read_key(None, upload_id))


@router.post("/files/{attachment_id}/region-read", response_model=OcrRegionReadOut)
def attachment_region_read(
    attachment_id: int,
    crop: UploadFile,
    page: int = Form(0),
    mode: str = Form("read"),
    reader: str = Form("vision"),
    session: Session = Depends(get_session),
) -> OcrRegionReadOut:
    """Read or describe a rectangle drawn on one page of an attached file.

    The attachment is looked up and not otherwise used, and that is the point:
    it is the authorisation check. Without it this would be "run a model on any
    image anyone posts", which is a different endpoint from the one that was
    asked for.
    """
    _existing_attachment(session, attachment_id)
    return _read_region(crop, page, mode, reader)


@router.post("/media/{upload_id}/region-read", response_model=OcrRegionReadOut)
def media_region_read(
    upload_id: int,
    crop: UploadFile,
    page: int = Form(0),
    mode: str = Form("read"),
    reader: str = Form("vision"),
    session: Session = Depends(get_session),
) -> OcrRegionReadOut:
    """`attachment_region_read`'s sibling for a `/media/` upload."""
    deps.get_or_404(session, MediaUpload, upload_id, "That upload could not be found.")
    return _read_region(crop, page, mode, reader)


@router.post("/files/{attachment_id}/page-caption", response_model=OcrPageReadOut)
def attachment_page_caption(
    attachment_id: int,
    page: int = 0,
    session: Session = Depends(get_session),
) -> OcrPageReadOut:
    """Describe the figures on one page of an attached PDF.

    The document half of captioning (UI_MODERNISATION_PLAN Phase 7.3). A file
    already has one whole-file caption; a slide deck needs one per page, since
    "a document with charts in it" describes every page in it equally badly.
    """
    attachment = _existing_attachment(session, attachment_id)
    if Path(attachment.filename).suffix.lower() != ".pdf":
        raise HTTPException(status_code=415, detail="Only PDF pages are described one at a time.")
    path = _within_dir(deps.get_config().uploads_dir, attachment.stored_name)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="That file is no longer on disk.")
    return _describe_page(path, page, _page_read_key(attachment_id, None))


@router.post("/media/{upload_id}/page-caption", response_model=OcrPageReadOut)
def media_page_caption(
    upload_id: int,
    page: int = 0,
    session: Session = Depends(get_session),
) -> OcrPageReadOut:
    """`attachment_page_caption`'s sibling for a `/media/` upload: two id
    spaces, two routes, one implementation underneath."""
    upload = deps.get_or_404(session, MediaUpload, upload_id, "That upload could not be found.")
    if Path(upload.filename).suffix.lower() != ".pdf":
        raise HTTPException(status_code=415, detail="Only PDF pages are described one at a time.")
    path = _within_dir(deps.get_config().data_dir / "media", upload.filename)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="That file is no longer on disk.")
    return _describe_page(path, page, _page_read_key(None, upload_id))


@router.get("/files/{attachment_id}/page-reads", response_model=OcrRangeReadOut)
def attachment_page_reads(
    attachment_id: int,
    session: Session = Depends(get_session),
) -> OcrRangeReadOut:
    """Every page of this attachment that has already been read.

    Asked by the OCR workspace as it opens a document, so a reading that
    finished while the workspace was closed is still there when you come back
    - which is the whole point of `PageRead`. See that model's docstring for
    the report.
    """
    _existing_attachment(session, attachment_id)
    return _stored_range(_page_read_key(attachment_id, None))


@router.get("/media/{upload_id}/page-reads", response_model=OcrRangeReadOut)
def media_page_reads(
    upload_id: int,
    session: Session = Depends(get_session),
) -> OcrRangeReadOut:
    """Every page of this upload that has already been read."""
    deps.get_or_404(session, MediaUpload, upload_id, "That upload could not be found.")
    return _stored_range(_page_read_key(None, upload_id))


@router.delete("/files/{attachment_id}/page-reads/{page}", response_model=OcrRangeReadOut)
def delete_attachment_page_read(
    attachment_id: int,
    page: int,
    session: Session = Depends(get_session),
) -> OcrRangeReadOut:
    """Forget one page's reading. Returns what is left, in the same envelope
    `GET .../page-reads` uses, so the workspace can repaint from the response
    rather than issuing a second request."""
    _existing_attachment(session, attachment_id)
    binned_id = _forget_page_read(_page_read_key(attachment_id, None), page)
    return _stored_range(_page_read_key(attachment_id, None)).model_copy(update={"binned_id": binned_id})


@router.delete("/media/{upload_id}/page-reads/{page}", response_model=OcrRangeReadOut)
def delete_media_page_read(
    upload_id: int,
    page: int,
    session: Session = Depends(get_session),
) -> OcrRangeReadOut:
    """Forget one page's reading."""
    deps.get_or_404(session, MediaUpload, upload_id, "That upload could not be found.")
    binned_id = _forget_page_read(_page_read_key(None, upload_id), page)
    return _stored_range(_page_read_key(None, upload_id)).model_copy(update={"binned_id": binned_id})


@router.delete("/media/{upload_id}/readings/{source}", response_model=ReadingBinnedOut)
def delete_media_reading(
    upload_id: int, source: str, session: Session = Depends(get_session)
) -> ReadingBinnedOut:
    """Delete an image's whole reading (Tesseract's or the vision model's)
    into the bin (WORLD_CLASS_PLAN 28.4 row 2)."""
    deps.get_or_404(session, MediaUpload, upload_id, "That upload could not be found.")
    return _bin_file_reading(session, "upload", upload_id, source)


@router.delete("/files/{attachment_id}/readings/{source}", response_model=ReadingBinnedOut)
def delete_attachment_reading(
    attachment_id: int, source: str, session: Session = Depends(get_session)
) -> ReadingBinnedOut:
    """`delete_media_reading`'s sibling for a note's own file."""
    _existing_attachment(session, attachment_id)
    return _bin_file_reading(session, "attachment", attachment_id, source)


@router.post("/reading-bin/{bin_id}/restore", response_model=ReadingRestoredOut)
def restore_binned_reading(bin_id: int, session: Session = Depends(get_session)) -> ReadingRestoredOut:
    """Put a deleted reading back where it came from (Undo, or the Bin)."""
    restored = reading_bin.restore(session, bin_id)
    if restored is None:
        raise HTTPException(status_code=404, detail="That reading is no longer in the bin.")
    out = ReadingRestoredOut(
        kind=restored.kind, source_id=restored.source_id, field=restored.field, page=restored.page
    )
    session.commit()
    if out.field != "page":
        _forget_regions((out.kind, out.source_id))
    with deps.get_db().session() as fresh:
        _reindex_file(fresh, out.kind, out.source_id)
        fresh.commit()
    return out


@router.delete("/reading-bin/{bin_id}/purge")
def purge_binned_reading(bin_id: int, session: Session = Depends(get_session)) -> dict:
    """Delete a binned reading for good, from the Bin's own menu."""
    if not reading_bin.purge(session, bin_id):
        raise HTTPException(status_code=404, detail="That reading is no longer in the bin.")
    session.commit()
    return {"purged": True}


@router.post("/files/{attachment_id}/ocr-clean-loops", response_model=AttachmentGalleryOut)
def clean_attachment_reading_loops(
    attachment_id: int, session: Session = Depends(get_session)
) -> AttachmentGalleryOut:
    """**"Clean up repeated lines"** in the OCR workspace/lightbox menu
    (INBOX 423f). Runs the same `cut_reading_loops` a fresh reading is
    always passed through (ai/vision_ocr.py) over whichever of this
    attachment's readings already have text, in place: the guard at the
    point a reading is produced does nothing for one that was already
    stored before it existed, or one a since-changed model still managed to
    loop, and nothing else ever re-reads a stored reading on its own.
    Idempotent: a reading with no loop, or one already cleaned, comes back
    unchanged.
    """
    attachment = _existing_attachment(session, attachment_id)
    changed = _clean_reading_fields(
        ("vision_ocr_text", attachment.vision_ocr_text),
        ("ocr_text", attachment.ocr_text),
    )
    if changed:
        for name, value in changed.items():
            setattr(attachment, name, value)
        session.commit()
    return _attachment_out(session, attachment)


@router.post("/media/{upload_id}/ocr-clean-loops", response_model=MediaUploadOut)
def clean_media_reading_loops(
    upload_id: int, session: Session = Depends(get_session)
) -> MediaUploadOut:
    """`clean_attachment_reading_loops`'s sibling for a media upload."""
    upload = deps.get_or_404(session, MediaUpload, upload_id, "That upload could not be found.")
    changed = _clean_reading_fields(
        ("vision_ocr_text", upload.vision_ocr_text),
        ("ocr_text", upload.ocr_text),
    )
    if changed:
        for name, value in changed.items():
            setattr(upload, name, value)
        session.commit()
    return MediaUploadOut(
        id=upload.id,
        url=f"/media/{upload.filename}",
        original_name=upload.original_name,
        ocr_text=upload.ocr_text or "",
        caption=upload.caption or "",
        caption_model=upload.caption_model or "",
        caption_edited=upload.caption_edited,
        vision_ocr_text=upload.vision_ocr_text or "",
        vision_ocr_model=upload.vision_ocr_model or "",
    )


@router.post("/media/{upload_id}/vision-ocr", response_model=MediaUploadOut)
def vision_ocr_media(
    upload_id: int, body: VisionOcrBody = VisionOcrBody(), session: Session = Depends(get_session)
) -> MediaUploadOut:
    """Read the text in one image with a vision model, the "extractor
    mode" asked for directly, distinct from the local Tesseract pass
    (`ocr_text`, automatic on upload) and from the AI caption (`caption`, a
    description rather than a transcription). Manual only: never triggered
    by `POST /media/upload` itself, unlike captioning.

    Same synchronous, single-round-trip shape as `caption_media` above: 
    one model call, no different from the AI-edit or link-reason calls this
    app already blocks on behind a spinner.
    """
    upload = deps.get_or_404(session, MediaUpload, upload_id, "That upload could not be found.")
    if Path(upload.filename).suffix.lower() not in vision_ocr.VISION_OCR_SUFFIXES:
        raise HTTPException(status_code=415, detail="Only images can be read this way.")
    if body.text is not None:
        # A hand-typed correction, or "" to clear a wrong reading. Checked
        # before the backend is: fixing a bad transcription must not require
        # the model that produced it to still be running.
        upload.vision_ocr_text = body.text.strip() or None
        if not upload.vision_ocr_text:
            # Clearing the text clears the attribution with it, "Read by X"
            # under nothing is a claim about a reading that no longer exists.
            upload.vision_ocr_model = None
        session.commit()
        if body.edited:
            _set_edited_reading(_page_read_key(None, upload.id), upload.vision_ocr_text, "vision")
        else:
            #: A stored edit describes the text it was made on; any other
            #: replacement (a clear, a fixture) makes it stale.
            _forget_regions(_page_read_key(None, upload.id), only_source="edited-")
        return MediaUploadOut(
            id=upload.id,
            url=f"/media/{upload.filename}",
            original_name=upload.original_name,
            ocr_text=upload.ocr_text or "",
            caption=upload.caption or "",
            caption_model=upload.caption_model or "",
            caption_edited=upload.caption_edited,
            vision_ocr_text=upload.vision_ocr_text or "",
            vision_ocr_model=upload.vision_ocr_model or "",
        )
    if not deps.get_ollama().is_running():
        raise HTTPException(status_code=409, detail="The AI model isn't running.")
    model = deps.get_model_manager().resolve_ocr_model(deps.get_ollama())
    if not model:
        raise HTTPException(
            status_code=409,
            detail="No installed model can read images. Install or "
            "pick one in Settings → Models.",
        )
    media_dir = deps.get_config().data_dir / "media"
    vision_ocr.vision_ocr_and_store(upload.id, media_dir / upload.filename, force=body.force)
    session.refresh(upload)
    #: A fresh reading replaces a hand edit of the sections, same as Tesseract's.
    _forget_regions(_page_read_key(None, upload.id), only_source="edited-")
    return MediaUploadOut(
        id=upload.id,
        url=f"/media/{upload.filename}",
        original_name=upload.original_name,
        ocr_text=upload.ocr_text or "",
        caption=upload.caption or "",
        caption_model=upload.caption_model or "",
        caption_edited=upload.caption_edited,
        vision_ocr_text=upload.vision_ocr_text or "",
        vision_ocr_model=upload.vision_ocr_model or "",
    )


@media_router.get("/media/{filename}")
def get_media(filename: str) -> FileResponse:
    """Serve generic uploaded media.

    The suffix is checked again on the way out, not only on the way in. Upload
    is not the only route into this folder, a restored backup, a synced data
    directory, or a future writer could put something here, and this is the
    endpoint that decides what the browser executes.
    """
    name = safe_filename(filename)
    if Path(name).suffix.lower() not in MEDIA_SUFFIXES:
        raise HTTPException(status_code=404, detail="That media file could not be found.")
    path = deps.get_config().data_dir / "media" / name
    if not path.is_file():
        raise HTTPException(status_code=404, detail="That media file could not be found.")
    # `nosniff` is already set globally, but the header below is the one that
    # decides whether a PDF opens in the page or downloads, and an inline PDF
    # viewer is a script host. Nothing here needs to render in-place: markdown
    # embeds images with <img>, which ignores Content-Disposition.
    return FileResponse(
        path, headers={"Content-Disposition": f'inline; filename="{name}"'}
    )

