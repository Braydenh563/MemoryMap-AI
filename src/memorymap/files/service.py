"""Files: reading, saving, listing and converting the files a notebook keeps.

Moved out of `memorymap/api/routes_files.py` (WORLD_CLASS_PLAN decision 55,
Brief 61): the route parses and shapes the answer, this module does the
work. No behaviour changed; the route tests prove it."""

from __future__ import annotations

import json
import os
import re
import tempfile
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from fastapi import HTTPException, UploadFile

from memorymap.core import activity
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from memorymap.ai import captioning, vision_ocr
from memorymap.core import (
    deps,
    ocr,
    pdfpages,
    reading_bin,
)
from memorymap.core.database import Attachment, Entry, MediaUpload, PageRead
from memorymap.entry import manager


logger = logging.getLogger(__name__)


MAX_FILE_BYTES = 50 * 1024 * 1024  # a personal notebook, not a fileserver


#: Note attachments, unlike /media/upload above, had no allowlist at all, 
#: any file, of any type, attached without a single refusal (asked for
#: directly: "make sure incompatible files are currently refused upon
#: attempted upload with an error message"). This one is broader than
#: MEDIA_SUFFIXES on purpose: attachments are downloaded (FileResponse's
#: default Content-Disposition: attachment, not rendered inline the way
#: /media/{name} is), so the stored-XSS concern that shaped that allowlist
#: doesn't apply here in the same way, but video and audio are still out
#: (no player exists for video; a recording is an object of its own,
#: `routes_recordings.py`, never an attachment: WORLD_CLASS_PLAN "Audio in
#: the notebook", decision 2) and so are the obvious
#: executable/script shapes, since nothing in this app ever needs to run
#: an attachment.
ATTACHMENT_SUFFIXES = frozenset(
    {
        # Images
        ".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".bmp", ".ico", ".svg", ".tiff", ".tif",
        # Documents
        ".pdf", ".docx", ".doc", ".odt", ".rtf",
        ".pptx", ".ppt", ".odp",
        ".xlsx", ".xls", ".ods", ".csv",
        # Text & markup
        ".txt", ".md", ".markdown", ".json", ".xml", ".yaml", ".yml", ".html", ".htm", ".css",
        # Code
        ".js", ".ts", ".jsx", ".tsx", ".py", ".java", ".c", ".h", ".cpp", ".hpp", ".cs", ".go",
        ".rs", ".rb", ".php", ".sh", ".sql", ".swift", ".kt",
        # Archives
        ".zip",
    }
)


def _existing_attachment(session: Session, attachment_id: int) -> Attachment:
    return deps.get_or_404(session, Attachment, attachment_id, "That attachment could not be found.")


class AttachmentGalleryOut(BaseModel):
    """One note's own file, shaped for the Library's Images/Files gallery: 
    not `MediaUploadOut`: an `Attachment` has never been OCR'd, captioned, or
    read by a vision model (those are `MediaUpload`-only features, see that
    model's own docstring), so reusing that shape would mean either faking
    fields that don't apply or leaving the gallery to guess why they're
    always empty. This is deliberately the smaller, honest set of what an
    attachment actually has.

    Reported directly, and root-caused rather than patched around: "a pdf I
    uplaoded to a note doesnt show in the libary" / "my uploaded pdf file
    isnt shown in the library files subtab". `renderLibraryImagesGallery()`
    (library.js) has only ever called `GET /media`, which is `MediaUpload`
    rows: a file attached to a note through the composer or note editor
    (`POST /entries/{id}/files`, this file, above) is an `Attachment` row
    instead, a completely different table, and so never appeared no matter
    how the gallery itself was styled or filtered.
    """

    id: int
    #: `/files/{id}`, gated the same way as `/media/{name}` (the media
    #: cookie, see `require_unlock_media` in routes_auth.py).
    #: Deliberately has no file extension (an attachment is served by id,
    #: not by stored name), which is why the gallery classifies Images vs.
    #: Files from `mime` here rather than sniffing the url the way it does
    #: for a `MediaUpload` row's `/media/{name}.ext`.
    url: str
    original_name: str
    mime: str
    created_at: str
    #: The one note this file hangs on, an attachment's "used in", where a
    #: `MediaUpload` row can be referenced from several places at once.
    #: Shaped as a single-item `used_by` list rather than a new field so the
    #: gallery tile's existing "used in" rendering (ROADMAP item 43) needs
    #: no branch for which kind of row it is looking at.
    used_by: list[dict] = []
    #: The file's size on disk, in bytes; 0 when it cannot be stat'ed (the
    #: row outliving its file is a real state, see the "Image deleted"
    #: placeholder the gallery already renders). The comment above says a
    #: byte count was left out because it "would cost one `stat` per row on
    #: every gallery load for a number nobody asked for", it has since been
    #: asked for directly ("file details such as the type, size, topic/
    #: category"), which settles the trade the other way. It is one `stat`
    #: per row against a local disk, on the same pass that already walks
    #: every row.
    size_bytes: int = 0
    #: What this file says, see `Attachment`'s own docstring for why these
    #: now exist on an attachment at all. Never null over the wire, the same
    #: convention `MediaUploadOut` keeps, so the gallery can filter on them
    #: with a plain substring test.
    caption: str = ""
    caption_model: str = ""
    caption_edited: bool = False
    ocr_text: str = ""
    vision_ocr_text: str = ""
    vision_ocr_model: str = ""
    #: True when this file has renderable pages (a PDF), so the tile can show
    #: the first one instead of a generic file glyph, asked for directly:
    #: "in the files tab, there is no preview".
    has_pages: bool = False
    #: How many of this document's pages have a stored reading (`PageRead`).
    #: UI_MODERNISATION_PLAN Phase 7.5: the Files row states "N pages read · N
    #: words" instead of clamping a paragraph nobody can read at that size, and
    #: counting pages by splitting the joined text would miscount any reading
    #: that happens to contain a blank line. 0 for anything never read, which
    #: is also the honest answer for an image.
    pages_read: int = 0


#: The gallery's page (WORLD_CLASS_PLAN F2): the response no longer grows with
#: the notebook. The default was the maximum until 2026-09-24, because five
#: callers read this endpoint whole through `apiJson`, one of them the
#: Library's own Files sub-tab, and a 200-row default under them would have
#: cut the Library off at two hundred attachments. They read to the end
#: through `apiPagedList` now, by `X-Total-Count`, and
#: `tests/test_gallery_paging.py` fails on a caller that reads one page.
GALLERY_PAGE_SIZE = 200


GALLERY_PAGE_SIZE_MAX = 1000


class AttachmentAnalyseBody(BaseModel):
    """What to read out of a file, or what to store instead of reading it."""

    #: "caption", a vision model describes it. "ocr", Tesseract (an image)
    #: or this app's own document extractor (anything else). "vision", a
    #: vision model transcribes the pages, which is the one that answers a
    #: scanned PDF or a diagram nothing else can read.
    kind: str = Field(pattern="^(caption|ocr|vision)$")
    #: Set the value by hand instead of running anything, "the text and
    #: analysis needs to be… modifyable by the user". `""` clears it back to
    #: "nothing here", the same as the `/media` endpoints this mirrors.
    text: str | None = Field(default=None, max_length=200_000)
    #: True only from the workspace's editor: the text is a correction the
    #: person made to the sections on screen, so those sections must stay what
    #: is shown (`_set_edited_reading`). Any other text-setting call (a
    #: fixture, a clear, an import) just replaces the stored text and lets the
    #: sections be derived again.
    edited: bool = False
    #: The local engine for `kind="ocr"` on a picture (INBOX 717): "" for the
    #: automatic pick, or "tesseract" / "rapidocr" by name.
    engine: str = Field(default="", max_length=20)
    #: Re-run even when there is already a value (a caption is written once
    #: and left alone otherwise, so nothing an AI wrote and a person read can
    #: silently change under them).
    force: bool = False


def _attachment_size(session: Session, attachment: Attachment) -> int:
    """Bytes on disk, or 0 when the file is gone.

    Same contract as `MediaUploadOut.size_bytes`: a row can outlive its file,
    and the gallery draws a placeholder for that rather than dropping the row,
    so this must report a number instead of raising.

    `Attachment.size` is written at upload time (`manager.add_attachment`)
    and kept current by every route that replaces the bytes on disk, so the
    column is normally already the right answer, read it first and skip the
    filesystem call `GET /files/gallery` used to pay once per attachment on
    every open (`list_media`'s sibling gallery has the same bug, open as
    PLAN.md P6; nothing here changes that one). `stat()` only runs for a row
    whose `size` is still NULL/0 (a pre-existing attachment from before this
    column existed) and whose file is actually there, and the result is
    written back so the next call, in this request's own list, and every
    request after: reads the column instead of the disk again.
    """
    if attachment.size:
        return attachment.size
    try:
        size = (deps.get_config().uploads_dir / attachment.stored_name).stat().st_size
    except OSError:
        return 0
    if size:
        attachment.size = size
        session.commit()
    return size


def _attachment_out(session: Session, attachment: Attachment) -> AttachmentGalleryOut:
    entry = session.get(Entry, attachment.entry_id)
    return AttachmentGalleryOut(
        id=attachment.id,
        url=f"/files/{attachment.id}",
        original_name=attachment.filename,
        mime=attachment.mime or "application/octet-stream",
        created_at=attachment.created_at.isoformat(),
        used_by=(
            [{"kind": "note", "id": entry.id, "label": manager.plain_label(entry.content)}]
            if entry is not None
            else []
        ),
        caption=attachment.caption or "",
        caption_model=attachment.caption_model or "",
        caption_edited=bool(attachment.caption_edited),
        ocr_text=attachment.ocr_text or "",
        vision_ocr_text=attachment.vision_ocr_text or "",
        vision_ocr_model=attachment.vision_ocr_model or "",
        has_pages=Path(attachment.filename).suffix.lower() == ".pdf" and pdfpages.available(),
        size_bytes=_attachment_size(session, attachment),
    )


class AttachedFileTextOut(BaseModel):
    """One attached file, read as text for the in-app viewer."""

    filename: str
    #: "markdown" | "code" | "plain", how to render `text`, not what the file
    #: is. A converted .docx comes back as markdown, so it renders like one.
    kind: str
    #: "file" | "converted" | "vision-ocr". Shown to the reader, not merely
    #: logged: a vision model's transcription of a scan is a *reading* of the
    #: file, and presenting it identically to text read out of a .txt would be
    #: the app stating a guess as a fact.
    source: str
    text: str = ""
    truncated: bool = False
    #: Why there is no text, when there is none. Never an error status: "this
    #: file has no viewer yet" and "install markitdown" are both answers, and
    #: a 4xx would make the viewer show a failure for a file that is fine.
    message: str = ""
    #: The optional package that would read it (`ViewedFile.extra`), so the
    #: viewer can offer Install beside the message.
    extra: str = ""
    #: Whether this file may be saved back over (`docview.editability`). True
    #: only where the text *is* the file, .md, .txt, .csv, code, so a .docx
    #: never is, and neither is a file too long to have been shown in full.
    editable: bool = False
    #: Why not, when `editable` is False. Written to be shown next to a
    #: disabled Edit button: §R7.1 item 2 asks for the honest reason in the UI
    #: rather than a control that does nothing.
    edit_message: str = ""


class FileTextIn(BaseModel):
    """The edited text of a file, on its way back to disk."""

    text: str


class PdfInfoOut(BaseModel):
    #: Whether the matching pdf-page endpoint can serve anything for this
    #: file: `media_pdf_page` for a `/media/` upload, `attached_file_pdf_page`
    #: for a note's own attachment. Moved up here, ahead of both `pdf-info`
    #: endpoints that return it: a FastAPI route decorator's `response_model`
    #: evaluates at import time, not lazily like a `from __future__ import
    #: annotations` type hint, so this has to exist before either decorator
    #: runs rather than merely before either function is called.
    available: bool
    #: Real page count, or 0 when `available` is False.
    pages: int
    #: Why `available` is False, for a caller that wants to say so rather
    #: than just hide the button. "" when `available` is True.
    message: str = ""


#: The policy the HTML preview's own response carries, and every token in it
#: is load-bearing.
#:
#: **Why a response of its own rather than a `blob:` iframe.** The first
#: version built a Blob in the browser and framed it, and a `blob:` document
#: inherits its creator's CSP, so the app's `style-src 'self'` applied to the
#: framed page and **the page's own `<style>` block was refused.** Measured in
#: Chromium: "Refused to apply inline style", and `background-color` came back
#: `rgba(0, 0, 0, 0)` on a page that sets `#eef`. A preview that strips the
#: file's styling is not a preview of that file, and relaxing the *app's*
#: `style-src` to fix it would trade the notebook's own protection for a
#: viewer feature. A same-origin HTTP response carries its own policy instead,
#: and this is it.
#:
#: - `sandbox` (no tokens): opaque origin, no scripts, no forms, no
#:   navigation, no storage. This is what makes serving a file this app did
#:   not write safe to render at all.
#: - `script-src 'none'`: belt and braces beside the sandbox.
#: - `style-src 'unsafe-inline'`: the whole point: a page's own `<style>`
#:   and `style=` attributes. Harmless inside an opaque, scriptless frame.
#: - `img-src data:`: inline images only. **No `'self'`**, so a page cannot
#:   probe this app's own endpoints by pointing an `<img>` at them.
#: - `default-src 'none'` catches everything unlisted: no fetch, no fonts, no
#:   frames, no media, nothing off the network.
#: - `frame-ancestors 'self'`: **named explicitly, and it has to be.**
#:   `default-src 'none'` covers `frame-ancestors` too, so without this line
#:   the response forbids *being framed at all* and the pane renders
#:   `chrome-error://`. Measured, after the first version shipped with only
#:   `default-src 'none'`. The matching `X-Frame-Options: SAMEORIGIN` below
#:   is for the same reason: the app's middleware `setdefault`s `DENY` on
#:   every response, which a route that knows better may override.
HTML_PREVIEW_CSP = (
    "sandbox; default-src 'none'; script-src 'none'; "
    "style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'; "
    "frame-ancestors 'self'"
)


class AttachmentRenameBody(BaseModel):
    filename: str = Field(min_length=1, max_length=255)


#: Where generated files land by default. Beside the notes rather than in the
#: OS Downloads folder, so "where your data is" stays one answer unless the
#: user deliberately points it elsewhere, see `_exports_dir` below, added
#: after a direct request for a configurable location ("I have to dig in the
#: app data files to find and access them").
EXPORTS_DIRNAME = "exports"


#: A generated export is text or a small archive, never a media library.
MAX_SAVE_BYTES = 50 * 1024 * 1024


def _exports_dir() -> Path:
    """`export_save_dir` preference if set (validated at save time, see
    `_validated_export_dir` in routes_settings.py: so this is always a real,
    writable directory when non-empty), else the default beside the notes.
    """
    custom = deps.get_config().get_preference("export_save_dir", "")
    return Path(custom) if custom else deps.get_config().data_dir / EXPORTS_DIRNAME


class SaveFileBody(BaseModel):
    """One file the browser built and wants written to disk."""

    filename: str = Field(min_length=1, max_length=120)
    #: Base64, because the same route has to carry a .zip as well as a .md.
    content_base64: str


def safe_filename(name: str) -> str:
    """A filename that cannot escape the exports folder.

    Not a sanitiser that tries to be clever, a whitelist. The name arrives
    from the browser, and the browser is not the trust boundary here even
    though the app is single-user: the AI writes some of these names.
    """
    cleaned = os.path.basename(str(name))  # drops any directory part, "..", drive letters
    cleaned = re.sub(r"[^A-Za-z0-9._ -]", "_", cleaned).strip(". ")
    if not cleaned:
        raise HTTPException(status_code=422, detail="That filename can't be used.")
    return cleaned[:120]


def _within_exports(exports: Path, name: str) -> Path:
    """`exports / name`, refusing anything whose resolved path lands outside
    `exports`. `safe_filename` already whitelists to a flat, traversal-free
    name, but CodeQL's `py/path-injection` still flagged the join as tainted
    (alerts #289/#290): the same shape HANDOVER.md already documents for
    the update-apply SSRF fix: a query's sanitiser recognition is narrower
    than "the code is provably safe," so the fix is a real containment
    check at the point of use, not a stronger filter upstream of it.

    **Third attempt at the exact recognised shape, not just an equivalent
    check.** `os.path.realpath`/`os.path.normpath`/`os.path.abspath` are all
    modelled by CodeQL's Python library as `Path::PathNormalization`, they
    mark the result "normalised" but do not by themselves clear the taint.
    The actual barrier is `Path::SafeAccessCheck`, whose only recognised
    Python implementation is a bare `<path>.startswith(<base>)` call used as
    a guard's sole condition (`if not fullpath.startswith(base_path): raise`
    - GitHub's own CWE-022 remediation example, and the shape
    `StartswithCall` in the standard library actually matches). The first
    attempt here used `Path.resolve()`/`Path.relative_to()`, which CodeQL's
    Python model does not extend `PathNormalization`/`SafeAccessCheck` to at
    all. The second attempt switched to `os.path` but combined the guard
    with `candidate != base and` and appended `+ os.sep` to the `startswith`
    argument: still flagged, most likely because a compound condition and a
    computed (rather than bare) argument stop the guard-node matcher from
    recognising it as the same `SafeAccessCheck` shape; a query's pattern
    matcher can be exactly this literal about it.

    So: the single-condition, bare-argument form below, and nothing else.
    The dropped nuance (a candidate exactly equal to `base`, and a
    sibling-directory collision like `base-evil` slipping past a
    separator-less prefix check) is not a real gap here specifically, 
    `safe_filename` already strips every path separator out of `name`
    before either caller passes it in, so `os.path.join(base, name)` can
    only ever produce `base + os.sep + <flat name>`, never a sibling path or
    `base` itself unless `name` were empty (already rejected upstream).
    """
    base = os.path.realpath(str(exports))
    candidate = os.path.realpath(os.path.join(base, name))
    if not candidate.startswith(base):
        raise HTTPException(status_code=422, detail="That filename can't be used.") from None
    return Path(candidate)


def _within_dir(base_dir: Path, name: str) -> Path:
    """`_within_exports`'s own containment check, generalised to any base
    directory: the PDF-page endpoints' `_media_upload_path` and the two
    attachment `pdf-page`/`pdf-info` routes each build a path from a name
    that traces back to a request parameter (via a DB round trip, but
    CodeQL's `py/path-injection` tracks the taint through the query filter
    regardless), the same shape `_within_exports` already exists to close.
    Kept as its own function rather than reusing `_within_exports` directly:
    that one is precision-tuned to the exact guard shape CodeQL's
    `Path::SafeAccessCheck` recognises (see its own long comment on how many
    equivalent-looking forms it rejected) and duplicating the same five
    lines here is safer than risking that tuning by generalising its name
    or signature for a second, differently-named caller.
    """
    base = os.path.realpath(str(base_dir))
    candidate = os.path.realpath(os.path.join(base, name))
    if not candidate.startswith(base):
        raise HTTPException(status_code=422, detail="That file can't be used.") from None
    return Path(candidate)


#: **What is in the exports folder, and each file back out of it.**
#:
#: Asked for directly (INBOX 159): "exported or downloaded files and images
#: etc should appear in the notifications to be accessible, maybe there should
#: also be an area somewhere maybe in settings to open the exports folder
#: location and access exported or downloaded files". `save_generated_file`
#: above wrote the files and `open_exports_folder` below reveals the folder,
#: but only on the desktop, and only if you remembered a toast. This is the
#: list Settings draws and the download link each row carries, so a browser
#: tab can get its exports back too: a file the app wrote is served from the
#: folder it wrote it to, contained by `_within_exports` exactly as the write
#: was.
#:
#: Newest first and capped, because the folder grows one file per export for
#: as long as the app is used and a settings screen is not a file manager;
#: the folder itself is one click away for the rest.
EXPORTS_LIST_LIMIT = 50


#: What `/media/` will accept and, more to the point, what it will serve.
#:
#: This folder exists for images dropped into markdown, and `/media/{name}`
#: serves its contents from the app's **own origin**: so an `.html` or `.svg`
#: landing here is a script running with the notebook's cookies and unlock
#: token, not a picture. That is a stored-XSS shape even though the app is
#: single-user and local, and it is worth closing for one reason above the
#: others: the AI can write into this folder too, so "the only person who can
#: put a file here is the person at the keyboard" is not true.
#:
#: An allowlist rather than a denylist of dangerous types, because the failure
#: mode of a missing entry is "this image didn't upload", and the failure mode
#: of a missed denylist entry is the paragraph above.
MEDIA_SUFFIXES = frozenset(
    {".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".bmp", ".ico", ".pdf"}
)


class MediaUploadOut(BaseModel):
    id: int
    url: str
    original_name: str
    #: "" until OCR finishes (or never, off the tesseract binary, or a PDF)
    #:, never null over the wire, so the frontend can filter on it with a
    #: plain substring match without a null check at every call site.
    ocr_text: str = ""
    #: "" until captioning finishes (or never, no vision model available, or
    #: a PDF): same never-null convention as ocr_text, same reason.
    caption: str = ""
    #: Which model wrote `caption`, or "" when there is none or it was only
    #: ever typed by hand. Surfaced so a caption reads as one model's guess,
    #: not the app's own opinion (asked for directly).
    caption_model: str = ""
    #: True once a person has typed over an AI caption, or typed one from
    #: scratch: see `MediaUpload.caption_edited`'s docstring.
    caption_edited: bool = False
    #: A vision model's verbatim transcription of text in the image
    #: (`ai/vision_ocr.py`), distinct from `ocr_text` (Tesseract) and from
    #: `caption` (a description). "" until run, or when a run found no
    #: legible text: same never-null convention as the other two.
    vision_ocr_text: str = ""
    #: Which model wrote `vision_ocr_text`, or "" when there is none.
    vision_ocr_model: str = ""
    #: When it was uploaded, ISO-8601. Asked for with the lightbox rework, 
    #: "maybe it can have the image information and other info about it below
    #: the image", and it is the one fact of that kind the browser cannot
    #: work out for itself: dimensions come from the decoded image, the name
    #: is already here, and a byte count would cost one `stat` per row on
    #: every gallery load for a number nobody asked for.
    created_at: str = ""
    #: True when this upload has pages the server can draw (a PDF, with the
    #: render extra installed), the same field and meaning as the attachment
    #: gallery's: the tile asks for a first page only then.
    has_pages: bool = False
    #: Bytes on disk, filled by `media_meta` only (one `stat` for the one file
    #: asked about, which the listing above declines to pay per row). The
    #: attachment card states it beside the kind (INBOX 440 (2)); 0 means
    #: unknown or gone, and the card then says nothing rather than "0 B".
    size: int = 0
    #: **Where this file is actually used**, one entry per note, document or
    #: board that references it, as `{kind, id, label}`. The gallery showed a
    #: thumbnail, a filename and two empty prompts and could not answer the
    #: only question anyone brings to it: what is this attached to? Empty
    #: means genuinely unreferenced (the same condition the orphan check uses
    #:, both read `media_gc.referenced_names`, so they cannot disagree).
    used_by: list[dict] = []
    #: True when a locked private note made the usage scan incomplete, so an
    #: empty `used_by` means "could not check" rather than "not used". The UI
    #: must not call a file unused on this basis.
    usage_incomplete: bool = False
    #: Size on disk in bytes; 0 when the file cannot be stat'ed (a row
    #: outliving its file is a real state the gallery already draws a
    #: placeholder for). Asked for directly with the Files sub-tab redesign:
    #: "file details such as the type, size, topic/category".
    size_bytes: int = 0
    #: How many of this document's pages have a stored reading, see
    #: `AttachmentGalleryOut.pages_read` for why the count is sent rather than
    #: derived from the joined text.
    pages_read: int = 0


#: A page of the gallery, not a ceiling on how many uploads a notebook may
#: hold: `X-Total-Count` reports the real size and `offset` reaches the
#: rest, so `renderLibraryImagesGallery` and `ocrLoadSiblings` (library.js)
#: page until they have everything. 200 rather than the grid's own page
#: size because both of those need the whole set (one to search it, one to
#: build the OCR workspace's rail), and 200 keeps the number of round trips
#: sane. The **max** is 500 rather than the 1000 the document and reminder
#: lists allow, because a row here is not a fixed cost: `ocr_text`,
#: `caption` and `vision_ocr_text` ride along, and a page of scanned text
#: can be kilobytes on its own, so a row count is a poor proxy for bytes and
#: the ceiling is set lower to compensate.
MEDIA_PAGE_SIZE = 200


MEDIA_PAGE_SIZE_MAX = 500


class MediaOrphansOut(BaseModel):
    orphans: list[MediaUploadOut]
    #: True when a locked private note made the check incomplete, the list
    #: above is not exhaustive in that case, and DELETE refuses to act on it.
    skipped_private: bool
    #: How many uploads DELETE actually removed. Always 0 for the GET dry run.
    deleted: int = 0
    #: How many orphans there are in total, which is not `len(orphans)` once
    #: the GET is paged.
    total: int = 0


def _media_size(filename: str) -> int:
    """Bytes on disk for one upload, or 0 when it is gone or unreadable."""
    try:
        return _within_dir(deps.get_config().data_dir / "media", filename).stat().st_size
    except (OSError, HTTPException):
        return 0


def _media_upload_path(session: Session, filename: str) -> tuple[MediaUpload, Path]:
    upload = session.query(MediaUpload).filter(MediaUpload.filename == filename).first()
    if not upload:
        raise HTTPException(status_code=404, detail="No upload by that name.")
    path = _within_dir(deps.get_config().data_dir / "media", upload.filename)
    if not path.exists():
        raise HTTPException(status_code=404, detail="That file is no longer on disk.")
    return upload, path


#: An embed of one stored file: `![alt](/media/name.png)` or
#: `![alt](/files/12)`, with the optional title markdown allows. Written
#: against a *literal* url (escaped by the caller), so there is no
#: user-controlled repetition in it, the shape CodeQL flags as
#: polynomial-ReDoS is exactly what this avoids.
def _embed_pattern(url: str) -> re.Pattern[str]:
    #: Markdown's optional title, in either quote style.
    title = r"""(?:\s+["'][^"'\n]{0,200}["'])?"""
    return re.compile(r"!\[[^\]\n]{0,200}\]\(" + re.escape(url) + title + r"\)")


def _strip_embeds(session: Session, url: str) -> list[int]:
    """Remove every `![...](url)` from the notes that hold one.

    Reported directly: *"notes still mention removed images"*. Deleting the
    file left the markdown behind, so the note rendered a placeholder saying
    the image was gone, forever, with no way to tidy it but editing the note
    by hand and knowing what to look for.

    Only the **embed** is removed, never a link: `[see the scan](/media/x.png)`
    is a sentence the author wrote and would be a hole in their prose if it
    vanished. And only exact-url matches, so nothing else in the note moves.
    """
    pattern = _embed_pattern(url)
    touched: list[int] = []
    #: `LIKE` narrows the scan to notes that mention the url at all; the
    #: regex above decides. A private note is encrypted at rest and its
    #: content is not readable here, which is also why one cannot embed a
    #: Library image into one in the first place.
    rows = session.scalars(
        select(Entry).where(
            Entry.is_deleted.is_(False),
            Entry.is_private.is_(False),
            Entry.content.contains(url),
        )
    ).all()
    for entry in rows:
        cleaned = pattern.sub("", entry.content or "")
        if cleaned == entry.content:
            continue
        #: The blank line the embed used to sit on goes with it, otherwise a
        #: note loses a picture and gains a gap where it was.
        entry.content = re.sub(r"\n{3,}", "\n\n", cleaned).strip()
        touched.append(entry.id)
    if touched:
        session.commit()
    return touched


class MediaRenameBody(BaseModel):
    original_name: str = Field(min_length=1, max_length=300)


class CaptionBody(BaseModel):
    #: The write-once rule (`captioning.caption_and_store`) otherwise leaves
    #: an existing caption alone, this is the one way to overwrite one,
    #: asked for directly: "if one is already there, another doesn't need
    #: to be written unless the user presses the button to rewrite it."
    force: bool = False
    #: A caption typed by hand instead of generated, asked for directly
    #: ("allow for manual input of image captions"). `None` (the default)
    #: means "generate one"; any string, including "", sets the caption to
    #: exactly that text and skips the model entirely, a person editing a
    #: caption is not asking for a second opinion. `""` clears it back to
    #: uncaptioned rather than storing an empty string as if it meant
    #: something, matching the null/"not captioned yet" convention
    #: `MediaUpload.caption` already uses.
    text: str | None = Field(default=None, max_length=2000)
    #: Who wrote `text` (the owner, 2026-09-24). "hand" is a person at a caption field,
    #: which is every caller but one. "app" is the app describing a picture
    #: it made itself, a board export's "Part of the mind map ..., exported
    #: from MemoryMap" line: stored as written by `APP_CAPTION_AUTHOR` and not
    #: as edited, so the lightbox and the Library card stop saying "typed by
    #: hand" about text nobody typed, and a vision model that later replaces
    #: it is credited alone rather than read as a person's edit. Kept in
    #: `caption_model` rather than a new column: that field already means
    #: "who wrote this caption", and a sentinel there needs no migration.
    source: Literal["hand", "app"] = "hand"


#: The name the app's own captions are credited to (see `CaptionBody.source`).
APP_CAPTION_AUTHOR = "MemoryMap"


class OcrBody(BaseModel):
    #: A correction typed by hand instead of re-run, asked for directly
    #: ("allow the user to access, view, and edit OCR extracted text"),
    #: same "None means generate, any string sets it exactly" convention as
    #: `CaptionBody.text`. `""` clears it back to "nothing extracted",
    #: matching `ocr_text`'s own null/"not run or found nothing" meaning.
    text: str | None = Field(default=None, max_length=10_000)
    #: True only from the workspace's editor: the text is a correction the
    #: person made to the sections on screen, so those sections must stay what
    #: is shown (`_set_edited_reading`). Any other text-setting call (a
    #: fixture, a clear, an import) just replaces the stored text and lets the
    #: sections be derived again.
    edited: bool = False
    #: The local engine to read with (INBOX 717): "" for the automatic pick,
    #: or "tesseract" / "rapidocr" by name, validated like a reader.
    engine: str = Field(default="", max_length=20)


class OcrRegionBox(BaseModel):
    #: Fractions of the image, top-left origin, see `ocr.extract_regions`
    #: for why these are not pixels.
    x: float
    y: float
    w: float
    h: float


class OcrWordOut(BaseModel):
    text: str
    x: float
    y: float
    w: float
    h: float


class OcrRegionOut(BaseModel):
    index: int
    #: From Tesseract: "text" or "heading" only: it reports boxes and
    #: confidences, and a semantic label guessed from box *geometry* would be a
    #: guess presented as a fact. From a reading (`ocr.regions_from_reading`),
    #: also "list", "table" and "code", because those are read off the block's
    #: own shape, pipes, bullets, a fence, which is evidence rather than
    #: inference.
    kind: str
    text: str
    confidence: float
    #: **None when nothing measured where this block sits.** A reading gives
    #: order and structure but no pixels, and a box covering the whole page
    #: would be a wrong answer rather than a missing one, the workspace can
    #: render a list without a rectangle, but it cannot un-draw a lie about
    #: where the text was.
    box: OcrRegionBox | None = None
    #: Each word and where it sits, from an optical reader only (Live Text,
    #: WORLD_CLASS_PLAN 28.4 row 7). Empty for a reading, which has no pixels,
    #: and for a cache stored before words were kept.
    words: list[OcrWordOut] = []


class OcrStoredReadingOut(BaseModel):
    #: "vision" or "tesseract": which field this is, and so which one a
    #: delete clears.
    source: str
    label: str
    text: str
    #: Whether the regions in the same answer were split from this text.
    in_regions: bool = False


def _stored_readings(
    vision_text: str | None, vision_model: str | None, tesseract_text: str | None, regions_source: str
) -> list[OcrStoredReadingOut]:
    vision = (vision_text or "").strip()
    tesseract = (tesseract_text or "").strip()
    out: list[OcrStoredReadingOut] = []
    if vision:
        out.append(
            OcrStoredReadingOut(
                source="vision",
                label=f"Read by {vision_model or 'a vision model'}",
                text=vision,
                in_regions=regions_source in {"reading", "edited-vision"},
            )
        )
    if tesseract:
        out.append(
            OcrStoredReadingOut(
                source="tesseract",
                label="Read with Tesseract OCR",
                text=tesseract,
                #: The sections are split from the vision reading when there
                #: is one (`stored` prefers it), and are Tesseract's own boxes
                #: when the source says so.
                in_regions=regions_source in {"tesseract", "edited-tesseract"}
                or (regions_source == "reading" and not vision),
            )
        )
    return out


class OcrRegionsOut(BaseModel):
    width: int
    height: int
    regions: list[OcrRegionOut]
    #: "tesseract" when the boxes are real; "reading" when they were derived
    #: from the text the vision model (or any other reader) already produced, 
    #: real blocks in real order, with no box; "none" when the page has not
    #: been read at all. The reader is told which, because a block list without
    #: boxes and a page of measured rectangles answer different questions and
    #: the UI draws them differently.
    #:
    #: "stored-text" is the retired third value: it meant "one region covering
    #: the whole page", which was a fallback that told you nothing about
    #: structure and existed only because splitting the reading had not been
    #: tried. Nothing emits it now.
    source: str
    message: str = ""
    #: How many pages this file has, when it is a document the workspace can
    #: page through (a PDF). 1 for an image, one page, no rail. The page rail
    #: is built from this rather than from a second request, because the
    #: workspace needs the count before it can draw anything at all.
    pages: int = 1
    #: Which page (0-based) these regions were read from. Echoed rather than
    #: assumed: `page` is clamped into range server-side, so a workspace that
    #: asked for page 99 of a 3-page PDF must be told which page it actually
    #: got.
    page: int = 0
    #: **Every stored reading of a picture, named by its reader** (INBOX 421
    #: e: "the text in the lightbox doesnt even appear in the ocr workspace").
    #: A picture keeps two: the vision model's and Tesseract's, separate
    #: fields, and the lightbox shows both (`lightboxReadingsFor`). The
    #: sections above come from one of them at most (`in_regions`); the
    #: workspace lists the other beside them, so the two views agree. Empty
    #: for a PDF, whose readings are per page (`PageRead`).
    readings: list[OcrStoredReadingOut] = []


#: **Reading a PDF page is rasterise-then-read, not a second OCR engine.**
#:
#: Reported: *"I begin generating ocr for a document… is the document ocr even
#: working??"* It was not, for the case that matters: `ocr.OCR_SUFFIXES` is
#: raster formats only, so both region routes below answered a PDF with 415, 
#: the workspace this feature was asked for ("for the document ocr I want smth
#: like this", three screenshots of Baidu's Unlimited-OCR) could not open a
#: document at all. Every piece needed already existed and was never joined up:
#: `core/pdfpages.py` renders a page to PNG for the lightbox, and
#: `ocr.extract_regions` reads a PNG.
def _pdf_regions_for(
    path: Path,
    index: int,
    stored_text: str,
    stored_label: str,
    key: tuple[str, int] | None = None,
    auto: bool = True,
    choice: str = "",
) -> OcrRegionsOut:
    if not pdfpages.available():
        return OcrRegionsOut(
            width=0,
            height=0,
            regions=[],
            source="none",
            pages=0,
            message=(
                "Reading a PDF page needs the small PDF rasteriser: install "
                "the “PDF pages” package in Settings, Packages."
            ),
        )
    count = pdfpages.page_count(path)
    if count <= 0:
        return OcrRegionsOut(
            width=0,
            height=0,
            regions=[],
            source="none",
            pages=0,
            message="That PDF could not be opened.",
        )
    index = max(0, min(index, count - 1))
    #: **Before the rasteriser, not after it.** `_regions_for` consults the
    #: same store, but by then this has already rendered the page to a PNG,
    #: and that render is ~20ms *serialised* behind `pdfpages`'s own lock (see
    #: that module on why the lock exists). Scrolling a long scan asks for
    #: every page it passes, so the render is the same per-look cost the
    #: reader was, on the same path, for an answer already in hand.
    cached = _stored_regions(key, index)
    if cached is not None:
        cached.pages = count
        cached.page = index
        return cached
    png = pdfpages.render_page(path, index)
    if not png:
        return OcrRegionsOut(
            width=0,
            height=0,
            regions=[],
            source="none",
            pages=count,
            page=index,
            message=f"Page {index + 1} could not be rendered.",
        )
    with tempfile.TemporaryDirectory() as tmp:
        page_path = Path(tmp) / f"page-{index}.png"
        page_path.write_bytes(png)
        #: Stored text belongs to the *document*, not to this page. Offering
        #: the whole file's reading as page 7's fallback would be the app
        #: stating a guess about where the text came from as a fact, the same
        #: line `_regions_for`'s own "stored-text" badge exists to hold.
        #: `key` and `index`, not the temporary file's path: the rasterised
        #: page lives in a directory that is deleted three lines from here, so
        #: the store has to be keyed by the page of the document it came from.
        out = _regions_for(
            page_path, stored_text if index == 0 else "", stored_label, key, index, auto, choice
        )
    out.pages = count
    out.page = index
    if out.source == "none":
        #: Points at the button, not at a system package. The vision reader is
        #: named first because it is the default and the one that needs no
        #: install; Tesseract is named too, but only when it is actually here, 
        #: an app that suggests a thing you do not have is an app telling you
        #: to go and solve a problem it created (see `READERS`, and the two
        #: opposite instructions this feature has been given).
        out.message = (
            f"Nothing has been read off page {index + 1} yet. "
            "Use “Read this page” to transcribe it."
        )
        if ocr.local_available():
            out.message += (
                " Either reader works here, the AI vision model, or "
                f"{ocr.engine_name()}, which is faster and marks where each block sits."
            )
    if out.source == "stored-text":
        out.message = f"{stored_label}: this is the whole document's reading, not page {index + 1}."
    return out


#: **The regions of a page, kept, because looking is not reading.**
#:
#: Reported (INBOX 314): *"the tesseract generates it continuously not only the
#: first time or when prompted by the iser"*. Measured before it was changed,
#: with a fake reader counting its own calls (`tests/test_ocr_region_cache.py`):
#: four looks at one image ran the reader four times, and two passes over a two
#: page PDF ran it four times, because the workspace re-asks this route every
#: time the page on screen changes and scroll mode changes it on every page you
#: scroll past. Nothing was stored and nothing was consulted.
#:
#: The pair below is the whole fix: read the store first, write it after a real
#: extraction. Both are silent on failure for the same reason
#: `_remember_page_read` is: the answer reached the caller, and losing the
#: *cache* of it must never turn that into an error a reader sees.
def _stored_regions(key: tuple[str, int] | None, page: int) -> OcrRegionsOut | None:
    """What the optical reader saw on this page last time, or None."""
    if not key:
        return None
    kind, source_id = key
    try:
        with deps.get_db().session() as session:
            row = (
                session.query(PageRead.regions)
                .filter(
                    PageRead.kind == kind,
                    PageRead.source_id == source_id,
                    PageRead.page == int(page),
                )
                .one_or_none()
            )
        blob = (row[0] if row else "") or ""
        if not blob.strip():
            return None
        return OcrRegionsOut(**json.loads(blob))
    except Exception:  # noqa: BLE001 - an unreadable cache is an empty one
        logger.debug("could not load the stored regions for a page", exc_info=True)
        return None


def _remember_regions(key: tuple[str, int] | None, page: int, out: OcrRegionsOut) -> None:
    """Store what the optical reader saw on this page, replacing any earlier copy.

    `pages` and `page` are left out of the stored body on purpose: how long the
    document is, and which page was asked for, are properties of the request
    rather than of the regions, and `_pdf_regions_for` sets both on the way
    out. Storing them would be a page count going stale in a cache.
    """
    if not key or out.source not in {"tesseract", "edited-tesseract", "edited-vision"}:
        return
    kind, source_id = key
    try:
        body = out.model_dump(exclude={"pages", "page"})
        with deps.get_db().session() as session:
            row = (
                session.query(PageRead)
                .filter(
                    PageRead.kind == kind,
                    PageRead.source_id == source_id,
                    PageRead.page == int(page),
                )
                .one_or_none()
            )
            if row is None:
                #: A page looked at but never read is a real state: the row
                #: carries the regions and an empty `text`, which is what keeps
                #: "N pages read" honest. See `PageRead.regions`.
                row = PageRead(kind=kind, source_id=source_id, page=int(page))
                session.add(row)
            row.regions = json.dumps(body)
            session.commit()
    except Exception:  # noqa: BLE001 - a cache write must never fail a read
        logger.debug("could not store the regions for a page", exc_info=True)


def _forget_regions(
    key: tuple[str, int] | None, page: int = 0, only_source: str | None = None
) -> None:
    """Throw away the stored rectangles for a page whose text just changed.

    The cache describes the page as it was read. A re-read, or a correction
    typed by hand, makes it describe something that no longer exists, and the
    workspace would go on drawing the old reading's boxes over the new one's
    words (found driving "Read again": the second read came back as the first).
    """
    if not key:
        return
    kind, source_id = key
    try:
        with deps.get_db().session() as session:
            row = (
                session.query(PageRead)
                .filter(
                    PageRead.kind == kind,
                    PageRead.source_id == source_id,
                    PageRead.page == int(page),
                )
                .one_or_none()
            )
            if row is not None and row.regions:
                if only_source and f'"source": "{only_source}' not in row.regions:
                    return
                row.regions = ""
                session.commit()
    except Exception:  # noqa: BLE001 - a cache clear must never fail a read
        logger.debug("could not clear the stored regions for a page", exc_info=True)


def _set_edited_reading(key: tuple[str, int] | None, text: str | None, field: str) -> None:
    """A reading corrected by hand becomes what the workspace shows.

    The sections are normally *derived*: Tesseract re-reads the picture, or
    the stored text is split. A hand edit has to win over a re-derivation, or
    the person saves a correction and sees the old words come back on the next
    look (found driving the editor). So the corrected text is stored as the
    page's sections, under the source "edited", and `_regions_for` serves it
    first like any stored look. `field` ("tesseract" or "vision") says which
    stored reading was edited, so Delete and the next edit write the same one.
    Empty text is a delete, not an edit: the page goes back to unread.
    """
    if not key:
        return
    stripped = (text or "").strip()
    if not stripped:
        _forget_regions(key)
        return
    blocks = ocr.regions_from_reading(stripped)
    _remember_regions(
        key,
        0,
        OcrRegionsOut(
            width=0,
            height=0,
            regions=[OcrRegionOut(**block) for block in blocks],
            source=f"edited-{field}",
            message="Edited by you. Read again to replace it with a fresh reading.",
        ),
    )


def _regions_for(
    path: Path,
    stored_text: str,
    stored_label: str,
    key: tuple[str, int] | None = None,
    page: int = 0,
    auto: bool = True,
    choice: str = "",
) -> OcrRegionsOut:
    """Region extraction with the honest fallback both callers below share.

    **Read once per page, not once per look at a page** (INBOX 314). `key` and
    `page` say which page this is, which is what makes the answer storable;
    without them (a caller that has no row to hang it on) this behaves exactly
    as it always did and reads the image every time. See `PageRead.regions` for
    why the store is a column on that table and not a reading of its own.
    """
    cached = _stored_regions(key, page)
    if cached is not None:
        return cached
    #: **Nothing stored and nobody asked: read nothing.** The owner, 2026-09-21:
    #: "I want to be able to disable tesseract in the ocr workspace, or if I am
    #: not selected on tesseract and am instead selected on the ocr model, then
    #: tesseract wont activate. I want tesseract to work once and then not alter
    #: what is generated after that unless the user selects an option."
    #:
    #: Storing the answer (above) stopped the *repeat* reads, but a first look
    #: at a page still ran Tesseract whether or not it was the reader the person
    #: had chosen, which is how a page they meant to read with the vision model
    #: came back transcribed by the other one. `auto` is false whenever the
    #: workspace's reader is not Tesseract, and then this returns the honest
    #: empty answer and the "use Read this page" message with it.
    #:
    #: **Not reading is not the same as not showing** (INBOX 421 e). This
    #: used to return the empty answer outright, which skipped the stored
    #: reading below as well as Tesseract: with the vision model chosen (the
    #: owner's setting) a picture the model had already read opened on an
    #: empty panel while the lightbox showed its text. Only the read is
    #: skipped now; what is stored still becomes the sections.
    found = _local_regions(path, choice) if auto else None
    if found is not None:
        out = OcrRegionsOut(
            width=found["width"],
            height=found["height"],
            regions=[OcrRegionOut(**region) for region in found["regions"]],
            source="tesseract",
            message="" if found["regions"] else "No text was found on this page.",
        )
        #: Stored even when it found nothing: "this page was looked at and had
        #: no text on it" is an answer, and re-running the reader on every
        #: later look to be told the same thing is the cost this exists to
        #: remove. A real read of the page clears it (`_remember_page_read`).
        _remember_regions(key, page, out)
        return out
    text = (stored_text or "").strip()
    if not text:
        return OcrRegionsOut(
            width=0,
            height=0,
            regions=[],
            source="none",
            message=(
                "This page hasn't been read yet, read it and its sections "
                "will appear here."
            ),
        )
    #: **The page was read; split what it said.** Reported as "the regions
    #: dont work without tesseract but surely there's a better way", and there
    #: is: the vision model is this app's primary reader and it returns the
    #: page in order with its structure intact, so the blocks are already
    #: there: only the rectangles are missing. `regions_from_reading` types
    #: them from their own shape and numbers them, which is what makes "this
    #: text came from section 4 of page 2" answerable with nothing installed.
    blocks = ocr.regions_from_reading(text)
    #: **Worded by whether Tesseract is actually missing** (INBOX 423d). This
    #: always said "Install Tesseract", even when it was already on the
    #: machine and simply was not the reader that produced this text (the
    #: vision model is the default reader, so that is the common case, not
    #: the rare one): a program you already have does not need installing,
    #: it needs choosing. `ocr.local_available()` is the same check the
    #: "nothing read yet" message above already makes before naming it, and
    #: the engine is named as it is (Tesseract, or RapidOCR where Tesseract is
    #: not ready).
    positions_offer = (
        "Install Tesseract or RapidOCR to also see where each one sits on the page."
        if not ocr.local_available()
        #: The local reader was the reader and still placed nothing: telling
        #: the person to switch to what they already chose sent them in a circle.
        else f"{ocr.engine_name()} could not mark where each one sits on this page."
        if auto
        else f"Switch to {ocr.engine_name()} as the reader to also see where each one sits on the page."
    )
    return OcrRegionsOut(
        width=0,
        height=0,
        regions=[OcrRegionOut(**block) for block in blocks],
        source="reading",
        message=f"{stored_label}: sections come from the reading itself. {positions_offer}",
    )


class OcrPageReadOut(BaseModel):
    """One page of a document, read by a vision model."""

    page: int
    text: str = ""
    model: str = ""
    message: str = ""
    #: **What the figures on this page show**, a different claim from `text`,
    #: which is what the page *says*. Asked for directly: "image captioning,
    #: how it is done and displayed needs to be refined for pdf documents and
    #: other similar documents. with graphs, images and diagrams in them."
    #:
    #: On this model rather than in a separate response so the workspace and
    #: the lightbox render a page's reading and its description from one
    #: object; `""` when the page has never been described, which is the
    #: ordinary case and not an error. Same never-null convention the rest of
    #: this module keeps.
    caption: str = ""
    caption_model: str = ""
    #: **What an optical reader saw on this page while it was on screen**, as
    #: plain text, and a different claim again from `text`.
    #:
    #: Reported (INBOX 314): *"I can only view the extracted text on a single
    #: page"*. The reading panel lists one section per page of the document, and
    #: it could only list pages with a stored *reading*: a scan being read by
    #: Tesseract as you scroll has no reading of any page, so the panel held
    #: whichever page was on screen and nothing else, which is also why
    #: clicking a section could not take you to another page. This carries
    #: those pages, so the panel can list them without any of them claiming to
    #: be a transcription somebody asked for. See `PageRead.regions`.
    regions_text: str = ""


#: **A vision read scoped to the page you are looking at.**
#:
#: The existing vision path (`analyse`, kind="vision") reads a whole PDF, up
#: to `pdfpages.MAX_PAGES`, and stores one blob. That is the right shape for
#: "what is this document"; it is the wrong shape for the OCR workspace, where
#: the question is always "what does *this page* say" and a reader who wants
#: page 6 should not wait through five pages they have already checked.
#:
#: Nothing is stored: the workspace shows the reading beside the page and the
#: reader decides what to keep (Copy, Save to a note, or Save the reading onto
#: the file through the existing analyse endpoint). Reading is cheap to repeat
#: and a wrong transcription written onto the row is not.
def _reader_model(reader: str) -> str:
    """The model the named reader will actually use, or "" if there is none.

    One function so the picker (`ocr_readers`) and the read (`_vision_read_page`)
    cannot answer this differently, which is exactly what they did before, and
    is why "my ocr model shows as a vision model" survived a first fix.
    """
    manager = deps.get_model_manager()
    ollama = deps.get_ollama()
    if reader == "ocr":
        # The general "can anything here see an image" resolver. Named `ocr`
        # only because it is the *other* one from the workspace's default;
        # what it returns is whatever vision model the app would otherwise use.
        return manager.resolve_vision_model(ollama) or ""
    return manager.resolve_ocr_model(ollama) or ""


def _vision_read_page(path: Path, index: int, reader: str = "vision") -> OcrPageReadOut:
    if not pdfpages.available():
        return OcrPageReadOut(
            page=index,
            message=(
                "Reading a PDF page needs the small PDF rasteriser: install "
                "the “PDF pages” package in Settings, Packages."
            ),
        )
    if not deps.get_ollama().is_running():
        raise HTTPException(status_code=409, detail="The AI model isn't running.")
    model = _reader_model(reader)
    if not model:
        raise HTTPException(
            status_code=409,
            detail="No installed model can read images. Install or "
            "pick one in Settings → Models.",
        )
    count = pdfpages.page_count(path)
    if count <= 0:
        return OcrPageReadOut(page=index, message="That PDF could not be opened.")
    index = max(0, min(index, count - 1))
    png = pdfpages.render_page(path, index)
    if not png:
        return OcrPageReadOut(page=index, message=f"Page {index + 1} could not be rendered.")
    with tempfile.TemporaryDirectory(prefix="mm-pageocr-") as scratch:
        page_path = Path(scratch) / f"page-{index}.png"
        page_path.write_bytes(png)
        text = vision_ocr.vision_ocr_text(page_path, model, deps.get_ollama()) or ""
    return OcrPageReadOut(
        page=index,
        text=text.strip(),
        model=model if text.strip() else "",
        message="" if text.strip() else f"{model} found no text on page {index + 1}.",
    )


#: **The two readers, and why both exist.**
#:
#: This project was told, twice, in opposite directions. First: *"I basically
#: dont want to download tesseract and only want to use an ai vision learning
#: and ocr model for images and scanned documents"*, which is why every read
#: path here defaults to a vision model and why `core/pdfpages.py` exists at
#: all. Then, later and just as directly: *"make sure tesseract exists as an
#: alternative as well."*
#:
#: Both are satisfiable because they are not the same claim. The vision model
#: is the *default*; Tesseract is an *alternative you can pick*, and it is a
#: genuinely better answer for some work: it needs no model running, it reads a
#: page in about a tenth of a second rather than several seconds, it never
#: invents words that were not on the page (the failure `VisionOcrBody.text`
#: exists to let you correct), and it returns *where* each block sits, which a
#: vision model cannot. It is also the only reader that works with no GPU and
#: no model installed at all.
#:
#: Neither is silently substituted for the other: the reader that produced a
#: reading is named in the response, and a request for one that is not
#: installed says so rather than quietly answering with the other.
#: **Three, not two, because "the AI" was hiding two different models.**
#: Reported: *"in the ocr workspace, my ocr model shows as a vision model and
#: my actual vision model doesnt appear as an option at all."* Exactly right.
#: `resolve_ocr_model` prefers a dedicated document reader (GLM-OCR,
#: DeepSeek-OCR, PaddleOCR-VL) and falls back to a general vision model;
#: `resolve_vision_model` answers "can anything here see an image". On a
#: machine with both installed they return different models, and the
#: workspace offered one option, labelled "AI vision model", which named
#: whichever of the two the picker happened to resolve. The other model was
#: unreachable from the UI entirely.
#:
#: Worse, the two halves disagreed: `ocr_readers` was fixed to call
#: `resolve_ocr_model` and `_vision_read_page` was left calling
#: `resolve_vision_model`, so the picker could name one model and the read use
#: the other. That is the same "fixed at one of two call sites" shape this
#: repo keeps hitting, and it is why the report came back after the first fix.
#:
#: So each resolver gets its own reader name and its own option, and the read
#: uses the resolver its name promises. `"vision"` keeps meaning "the app's
#: default choice" for every existing caller and stored preference, it maps
#: to `resolve_ocr_model`, which is what a read has always actually done.
#: **RapidOCR by name** (INBOX 717, the owner: "does the ocr worspace give
#: rapidocr as an alternative??"). It was only ever the silent stand-in when
#: Tesseract was not ready. `"tesseract"` stays the local reader's id with the
#: automatic pick behind it (Tesseract when ready, else RapidOCR), because
#: stored readings and every older caller say it; `"rapidocr"` reads with
#: RapidOCR even when Tesseract is ready, and is refused when it is missing.
READERS = ("vision", "ocr", "tesseract", "rapidocr")


LOCAL_READERS = ("tesseract", "rapidocr")


def _checked_reader(reader: str) -> str:
    """400 on an unknown reader rather than silently using the default.

    A typo'd `?reader=tesserract` that quietly ran the vision model would
    charge a reader seconds of GPU time for a request they meant to be
    instant, and tell them Tesseract had done it. A named engine that is not
    installed is refused the same way, with the reason, rather than read by
    another one under its name.
    """
    name = (reader or "vision").strip().lower()
    if name not in READERS:
        raise HTTPException(
            status_code=400,
            detail=f"Pick one of these readers: {', '.join(READERS)}.",
        )
    if name == "rapidocr" and not ocr.rapidocr_available():
        raise HTTPException(status_code=400, detail=ocr.unavailable_reason("rapidocr"))
    return name


def _engine_choice(reader: str) -> str:
    """The `core.ocr` engine choice a local reader name stands for: `""` (the
    automatic pick) for "tesseract", the engine itself for "rapidocr"."""
    return "rapidocr" if reader == "rapidocr" else ""


def _checked_engine(engine: str) -> str:
    """The `?engine=` of a first look at a page: empty (automatic), or one of
    the local engines, validated like a reader."""
    name = (engine or "").strip().lower()
    if not name:
        return ""
    if name not in ocr.LOCAL_ENGINES:
        raise HTTPException(
            status_code=400,
            detail=f"Pick one of these engines: {', '.join(ocr.LOCAL_ENGINES)}.",
        )
    if name == "rapidocr" and not ocr.rapidocr_available():
        raise HTTPException(status_code=400, detail=ocr.unavailable_reason("rapidocr"))
    return "rapidocr" if name == "rapidocr" else ""


def _local_text(path: Path, choice: str = "") -> str:
    """`ocr.extract_text`, naming the engine only when one was chosen (a fake
    in a test, or an older caller, takes the path alone)."""
    with activity.track("ocr", "Reading text from a picture", stoppable=False):
        return ocr.extract_text(path, choice) if choice else ocr.extract_text(path)


def _local_regions(path: Path, choice: str = "") -> dict | None:
    """`ocr.extract_regions`, the same way as `_local_text`."""
    return ocr.extract_regions(path, choice) if choice else ocr.extract_regions(path)


def _page_read_key(attachment_id: int | None, upload_id: int | None) -> tuple[str, int] | None:
    """Which id space this read belongs to. See `PageRead` on why both."""
    if attachment_id is not None:
        return ("attachment", int(attachment_id))
    if upload_id is not None:
        return ("upload", int(upload_id))
    return None


def _remember_page_read(key: tuple[str, int] | None, result: OcrPageReadOut, reader: str) -> None:
    """Store one page's reading, replacing any earlier one for the same page.

    Silent on failure and never raises: a reading that reached the caller is a
    success, and losing the *cache* of it must not turn that into an error the
    reader sees. Empty readings are not stored, "the model found nothing on
    page 4" is not a transcription, and storing it would stop a later, better
    reader from being asked.
    """
    if not key or not (result.text or "").strip():
        return
    kind, source_id = key
    try:
        with deps.get_db().session() as session:
            row = (
                session.query(PageRead)
                .filter(
                    PageRead.kind == kind,
                    PageRead.source_id == source_id,
                    PageRead.page == int(result.page),
                )
                .one_or_none()
            )
            if row is None:
                row = PageRead(kind=kind, source_id=source_id, page=int(result.page))
                session.add(row)
            row.reader = reader
            row.model = result.model or ""
            row.text = result.text
            #: **The regions cache belongs to the page as it was read.** A
            #: fresh reading of this page replaces what the app knows about it,
            #: so the stored rectangles from the previous look are thrown away
            #: rather than left to describe a reading that no longer exists
            #: (INBOX 314). The next look re-reads the page once and stores
            #: that. Deleting a reading takes the whole row, so it needs no
            #: invalidation of its own.
            row.regions = ""
            row.created_at = datetime.now(timezone.utc)
            session.flush()
            _reindex_file(session, kind, source_id)
            #: Explicit: `DatabaseManager.session()` hands back a bare Session,
            #: and `with` on one closes it without committing, the whole point
            #: of this table is that the reading outlives the request.
            session.commit()
    except Exception:  # noqa: BLE001 - a cache write must never fail a read
        logger.debug("could not store the page reading", exc_info=True)


def _reindex_file(session, kind: str, source_id: int) -> None:  # noqa: ANN001
    """A page's words are the file's words (F10): put them in its index row.

    `page_reads` is not a model the index's flush hook watches, so a page read
    in the OCR workspace was never findable by search; the file's row is
    re-read here, in the same transaction as the reading it now carries.
    """
    from memorymap.search import index as search_index

    source = {"attachment": "attachments", "upload": "media"}.get(kind)
    if source is None:
        return
    try:
        search_index.touch(session, source, int(source_id))
    except Exception:  # noqa: BLE001  # the reading is kept even if the index is not
        logger.debug("could not re-index a file after a page reading", exc_info=True)


def _remember_page_caption(key: tuple[str, int] | None, page: int, caption: str, model: str) -> None:
    """Store one page's description, beside that page's reading.

    A near-twin of `_remember_page_read` above, and separate from it on
    purpose: a page can be described without being transcribed and transcribed
    without being described, so neither may touch the other's columns. Folding
    them into one function with optional arguments is how a describe call ends
    up quietly clearing a reading that took a minute of GPU time to produce.

    Silent on failure and never raises, same contract: a description that
    reached the caller is a success, and losing the *cache* of it must not turn
    that into an error the reader sees.
    """
    if not key or not (caption or "").strip():
        return
    kind, source_id = key
    try:
        with deps.get_db().session() as session:
            row = (
                session.query(PageRead)
                .filter(
                    PageRead.kind == kind,
                    PageRead.source_id == source_id,
                    PageRead.page == int(page),
                )
                .one_or_none()
            )
            if row is None:
                #: A page described but never read is a real state, the whole
                #: point of this being its own column, so the row is created
                #: here rather than requiring a reading to exist first.
                row = PageRead(kind=kind, source_id=source_id, page=int(page))
                session.add(row)
            row.caption = caption.strip()
            row.caption_model = model or ""
            session.flush()
            _reindex_file(session, kind, source_id)
            session.commit()
    except Exception:  # noqa: BLE001 - a cache write must never fail a describe
        logger.debug("could not store the page description", exc_info=True)


def _page_read_text_map(kind: str, ids: list[int]) -> dict[int, str]:
    """The joined per-page reading for each of `ids`, page order, one query.

    **Why a list endpoint needs this at all.** Reported: "the extracted ocr for
    files doesnt actually appear in the file rows in the files library subtab".
    A whole-file reading is stored on the row itself (`vision_ocr_text`); a PDF
    read *page by page* in the OCR workspace is stored as `PageRead` rows
    instead, and nothing joined the two, so a document with every page read
    still said "No text yet" everywhere outside the workspace, including to
    anyone scanning the library for it.

    One grouped query rather than one per row: these endpoints render whole
    galleries, and the same lookup done per row is the N+1 that makes a library
    of a hundred files feel broken.
    """
    #: `kind` is the same vocabulary `_page_read_key` writes: "attachment" for
    #: a file hanging off a note, "upload" for one in the media gallery. Using
    #: the route prefixes ("file"/"media") here instead would match no rows at
    #: all and fail silently, which is the shape this join exists to fix.
    if not ids:
        return {}
    try:
        with deps.get_db().session() as session:
            rows = (
                session.query(PageRead)
                .filter(PageRead.kind == kind, PageRead.source_id.in_(ids))
                .order_by(PageRead.source_id.asc(), PageRead.page.asc())
                .all()
            )
    except Exception:  # noqa: BLE001 - an unreadable cache is an empty one
        logger.debug("could not load stored page readings for a list", exc_info=True)
        return {}
    out: dict[int, list[str]] = {}
    for row in rows:
        text = (row.text or "").strip()
        if text:
            out.setdefault(row.source_id, []).append(text)
    return {source_id: "\n\n".join(parts) for source_id, parts in out.items()}


def _page_read_count_map(kind: str, ids: list[int]) -> dict[int, int]:
    """How many pages of each file have a stored reading, one query.

    **Why the count and not just the text.** UI_MODERNISATION_PLAN Phase 7.5:
    "OCR text for a long document does not fit where a photo's caption fits.
    The Files row shows a one-line summary (first sentence / N pages read / N
    words)". The joined text is already carried (`_page_read_text_map`), but
    counting pages out of it means splitting a string on a separator and
    hoping: a reading that happens to contain a blank line would be counted
    as two pages.

    A count of rows rather than of distinct pages, because `(kind, source_id,
    page)` is unique on this table: re-reading a page replaces its row, so
    there is exactly one row per page that has ever been read.
    """
    if not ids:
        return {}
    try:
        with deps.get_db().session() as session:
            rows = (
                session.query(PageRead.source_id, PageRead.text)
                .filter(PageRead.kind == kind, PageRead.source_id.in_(ids))
                .all()
            )
    except Exception:  # noqa: BLE001 - an unreadable cache is an empty one
        logger.debug("could not count stored page readings for a list", exc_info=True)
        return {}
    counts: dict[int, int] = {}
    for source_id, text in rows:
        #: Only pages with a *reading*. A page that has only been described
        #: (Phase 7.3) has a row here too, and counting it would tell the row
        #: that a transcription exists where none does.
        if (text or "").strip():
            counts[source_id] = counts.get(source_id, 0) + 1
    return counts


def _regions_text(blob: str | None) -> str:
    """The stored regions of one page as plain text, blocks in reading order.

    The blocks are joined with a blank line between them rather than a newline:
    they are separate blocks on the page, and running them together would make
    a heading and the paragraph under it look like one sentence.
    """
    if not (blob or "").strip():
        return ""
    try:
        found = json.loads(blob)
        parts = [(region.get("text") or "").strip() for region in found.get("regions") or []]
    except Exception:  # noqa: BLE001 - an unreadable cache is an empty one
        logger.debug("could not read the stored regions of a page", exc_info=True)
        return ""
    return "\n\n".join(part for part in parts if part)


def _stored_page_reads(key: tuple[str, int] | None) -> list[OcrPageReadOut]:
    """Every page of this document that has already been read, oldest page first."""
    if not key:
        return []
    kind, source_id = key
    try:
        with deps.get_db().session() as session:
            rows = (
                session.query(PageRead)
                .filter(PageRead.kind == kind, PageRead.source_id == source_id)
                .order_by(PageRead.page.asc())
                .all()
            )
            pages = [
                OcrPageReadOut(
                    page=row.page,
                    text=row.text or "",
                    model=row.model or "",
                    caption=row.caption or "",
                    caption_model=row.caption_model or "",
                    regions_text=_regions_text(row.regions),
                )
                for row in rows
            ]
            #: A row with nothing on it is one this table keeps for its own
            #: bookkeeping, not a page the workspace has anything to say about.
            #: Filtered here rather than in each caller: "already read" has
            #: three callers and they must not be able to disagree about it.
            return [
                page
                for page in pages
                if page.text.strip() or page.caption.strip() or page.regions_text.strip()
            ]
    except Exception:  # noqa: BLE001 - an unreadable cache is an empty one
        logger.debug("could not load stored page readings", exc_info=True)
        return []


def _read_page(
    path: Path,
    index: int,
    reader: str,
    key: tuple[str, int] | None = None,
) -> OcrPageReadOut:
    """One page, by whichever reader was asked for.

    Registered in `vision_ocr`'s running-reads list for the length of the call,
    which is what puts it in Settings → Background tasks. Asked for directly:
    "make sure eveyrhting appears in the bg processes in settings." A read is a
    model round-trip of several seconds and it appeared there nowhere, so
    closing the workspace mid-read left no sign anywhere that the app was still
    working.

    Here rather than in either reader, and here rather than in the two
    endpoints: `_read_range` loops over this function, so a range read shows up
    as its pages complete, which is also the only progress a range read has to
    report.
    """
    local = reader in LOCAL_READERS
    token = vision_ocr.register_page_read(
        f"Reading page {index + 1} of {path.name}",
        model=ocr.engine_name(_engine_choice(reader)) if local else "",
    )
    try:
        result = (
            _tesseract_read_page(path, index, _engine_choice(reader))
            if local
            else _vision_read_page(path, index, reader)
        )
        #: Stored as each page completes, not once the whole range is done:
        #: the point is that a read which finishes after the workspace has been
        #: closed is not lost, and a range read that is interrupted half way
        #: should keep the half it managed. See `PageRead`. A local reading is
        #: stored under the local reader's id, "tesseract", whichever engine
        #: ran; `model` says which one did (INBOX 717).
        _remember_page_read(key, result, "tesseract" if local else reader)
        return result
    finally:
        vision_ocr.finish_page_read(token)


def _describe_page(
    path: Path,
    index: int,
    key: tuple[str, int] | None = None,
) -> OcrPageReadOut:
    """Describe one page's figures with a vision model, and store the answer.

    Deliberately the same envelope (`OcrPageReadOut`) as a page *read*: the two
    are the two halves of "what is on page 4", the workspace renders them in
    one panel, and a second response shape would be a second renderer that can
    drift from it: the mistake `_stored_range`'s own docstring records.

    `resolve_vision_model`, not `resolve_ocr_model`: describing a figure is the
    general "can anything here see an image" job, and a dedicated document
    reader (GLM-OCR and friends) is tuned to transcribe, not to explain. That
    is also the distinction the reader picker draws between its two AI options
    - see `READERS` above.
    """
    if not pdfpages.available():
        return OcrPageReadOut(
            page=index,
            message=(
                "Describing a PDF page needs the small PDF rasteriser: install "
                "the “PDF pages” package in Settings, Packages."
            ),
        )
    if not deps.get_ollama().is_running():
        raise HTTPException(status_code=409, detail="The AI model isn't running.")
    model = deps.get_model_manager().resolve_vision_model(deps.get_ollama()) or ""
    if not model:
        raise HTTPException(
            status_code=409,
            detail="No installed model can read images. Install or "
            "pick one in Settings → Models.",
        )
    count = pdfpages.page_count(path)
    if count <= 0:
        return OcrPageReadOut(page=index, message="That PDF could not be opened.")
    index = max(0, min(index, count - 1))
    png = pdfpages.render_page(path, index)
    if not png:
        return OcrPageReadOut(page=index, message=f"Page {index + 1} could not be rendered.")
    #: Registered in the same running-reads list a page read uses, so a
    #: describe shows up in Settings → Background tasks like everything else, 
    #: "make sure eveyrhting appears in the bg processes in settings."
    token = vision_ocr.register_page_read(f"Describing page {index + 1} of {path.name}", model=model)
    try:
        with tempfile.TemporaryDirectory(prefix="mm-pagecap-") as scratch:
            page_path = Path(scratch) / f"page-{index}.png"
            page_path.write_bytes(png)
            caption = captioning.page_caption_text(
                page_path, index, count, model, deps.get_ollama()
            )
    finally:
        vision_ocr.finish_page_read(token)
    caption = (caption or "").strip()
    _remember_page_caption(key, index, caption, model)
    return OcrPageReadOut(
        page=index,
        caption=caption,
        caption_model=model if caption else "",
        message="" if caption else f"{model} had nothing to say about page {index + 1}.",
    )


def _tesseract_read_page(path: Path, index: int, choice: str = "") -> OcrPageReadOut:
    """Rasterise one PDF page and read it with Tesseract.

    Same shape as `_vision_read_page` on purpose: the caller should not have
    to know which reader it asked for to understand the answer. `model` carries
    the reader's name for the same reason the vision path puts the model's name
    there: the workspace prints *who read this*, and "a vision model" and
    "Tesseract" are different enough claims that the difference must survive
    the round trip.
    """
    if not pdfpages.available():
        return OcrPageReadOut(
            page=index,
            message=(
                "Reading a PDF page needs the small PDF rasteriser: install "
                "the “PDF pages” package in Settings, Packages."
            ),
        )
    reason = ocr.unavailable_reason(choice)
    if reason:
        raise HTTPException(status_code=409, detail=reason)
    count = pdfpages.page_count(path)
    if count <= 0:
        return OcrPageReadOut(page=index, message="That PDF could not be opened.")
    index = max(0, min(index, count - 1))
    png = pdfpages.render_page(path, index)
    if not png:
        return OcrPageReadOut(page=index, message=f"Page {index + 1} could not be rendered.")
    with tempfile.TemporaryDirectory(prefix="mm-pagetess-") as scratch:
        page_path = Path(scratch) / f"page-{index}.png"
        page_path.write_bytes(png)
        text = (_local_text(page_path, choice) or "").strip()
    #: The engine that read it, not the reader's id: the automatic pick can be
    #: RapidOCR, and a chosen RapidOCR always is (INBOX 717).
    engine = ocr.engine(choice) or "tesseract"
    return OcrPageReadOut(
        page=index,
        text=text,
        model=engine if text else "",
        message="" if text else f"{ocr.engine_name(choice)} found no text on page {index + 1}.",
    )


class OcrReadersOut(BaseModel):
    """Which readers this machine can actually use, right now.

    The workspace asks before it offers: a picker whose second entry always
    fails is worse than no picker, and "install Tesseract" is a real, one-click
    answer this app already knows how to give (`core/extras.py`).
    """

    #: The reader used when nothing is chosen.
    default: str = "vision"
    tesseract: bool = False
    vision: bool = False
    #: The model that would answer for the *default* reader, so the picker can
    #: name it rather than saying "a vision model" and leaving you to go and
    #: look. This is `resolve_ocr_model`: a dedicated document reader if one is
    #: installed, else the general vision model.
    vision_model: str = ""
    #: Why the default reader is unavailable, when it is, "the model isn't
    #: running" and "nothing installed can see images" need different fixes.
    vision_reason: str = ""
    #: The *other* model: what `resolve_vision_model` returns. Offered as its
    #: own reader whenever it differs from `vision_model`, because a machine
    #: with both GLM-OCR and Qwen-VL installed has two genuinely different
    #: readers and the workspace used to expose only one of them under a label
    #: that named the other. Empty when there is no second choice to make.
    ocr: bool = False
    ocr_model: str = ""
    ocr_reason: str = ""
    #: The Tesseract engine in full (`ocr.engine_status`): both halves, the
    #: version, the language packs and the one in use, and the one fix. The
    #: workspace's status line and Settings' Packages row read the same
    #: object, so they cannot disagree about what is installed.
    engine: dict = {}


class OcrLanguageBody(BaseModel):
    #: A Tesseract language code (`eng`, `deu`, `eng+deu`), or "" for the
    #: engine's default.
    language: str = Field(default="", max_length=80)


class OcrRangeReadOut(BaseModel):
    """Several pages of a document, read by one of the readers above."""

    pages: list[OcrPageReadOut] = []
    #: How many pages the spec asked for *after* clamping to the document, so
    #: the UI can say "read 8 of the 20 you asked for" rather than silently
    #: returning fewer.
    requested: int = 0
    read: int = 0
    page_count: int = 0
    message: str = ""
    #: Set by a page reading's delete: the bin row that holds it now, which
    #: Undo restores (`POST /reading-bin/{id}/restore`).
    binned_id: int | None = None


#: How many pages one range request may read. A vision pass is seconds per
#: page, so "all" on a 300-page scan is not a request anyone means to make
#: synchronously: the cap keeps a mis-click from occupying the model for an
#: hour, and the response says plainly how far it got so the reader can ask
#: for the next block rather than wondering.
MAX_RANGE_PAGES = 25


def _parse_page_spec(spec: str, count: int) -> list[int]:
    """`"all"`, `"3"`, `"1-5"`, `"1,4,7-9"` -> sorted 0-based page indices.

    **One-based on the way in, because that is what the page rail shows and
    what a person means by "page 1".** Anything unparseable is skipped rather
    than raising: a range typed with a stray character should read the pages
    it could understand, not refuse the lot.
    """
    text = (spec or "").strip().lower()
    if not text or text in {"all", "*"}:
        return list(range(count))
    wanted: set[int] = set()
    for part in text.replace(" ", "").split(","):
        if not part:
            continue
        if "-" in part[1:]:  # not a leading minus
            start_text, _, end_text = part.partition("-")
            if not (start_text.isdigit() and end_text.isdigit()):
                continue
            start, end = int(start_text), int(end_text)
            if start > end:
                start, end = end, start
            wanted.update(range(start - 1, end))
        elif part.isdigit():
            wanted.add(int(part) - 1)
    return sorted(i for i in wanted if 0 <= i < count)


#: Tesseract reads a rendered page in about a tenth of a second, so the cap
#: that keeps a mis-click from occupying a *model* for an hour has no reason to
#: apply to it. Still bounded: a 2,000-page scan is not a synchronous request
#: either: just bounded by what is actually slow.
MAX_TESSERACT_RANGE_PAGES = 200


def _read_range(
    path: Path,
    spec: str,
    reader: str = "vision",
    key: tuple[str, int] | None = None,
) -> OcrRangeReadOut:
    """Read every page the spec names, reusing the single-page reader.

    Deliberately a loop over `_read_page` rather than a second implementation:
    one place decides what "no rasteriser", "no vision model" and "nothing
    legible" mean, and a range read cannot drift away from what the per-page
    button does.
    """
    if not pdfpages.available():
        return OcrRangeReadOut(
            message=(
                "Reading a PDF needs the small PDF rasteriser: install the "
                "“PDF pages” package in Settings, Packages."
            )
        )
    count = pdfpages.page_count(path)
    if count <= 0:
        return OcrRangeReadOut(message="That PDF could not be opened.")
    indices = _parse_page_spec(spec, count)
    if not indices:
        return OcrRangeReadOut(
            page_count=count,
            message=f"No pages matched that range. This document has {count} page(s).",
        )
    requested = len(indices)
    limit = MAX_TESSERACT_RANGE_PAGES if reader in LOCAL_READERS else MAX_RANGE_PAGES
    capped = indices[:limit]
    pages = [_read_page(path, index, reader, key) for index in capped]
    read = sum(1 for page in pages if page.text)
    note = ""
    if requested > len(capped):
        last = capped[-1] + 1
        note = (
            f" Stopped after {len(capped)} pages (the limit for one go), "
            f"ask for {last + 1}-{min(last + limit, count)} to carry on."
        )
    return OcrRangeReadOut(
        pages=pages,
        requested=requested,
        read=read,
        page_count=count,
        message=(f"Read {read} of {len(capped)} page(s)." + note).strip(),
    )


def _stored_range(key: tuple[str, int] | None) -> OcrRangeReadOut:
    """What is already known about a document, in the shape a range read returns.

    The same shape on purpose: the workspace has one renderer for "here are
    some pages of text", and giving stored readings a different envelope would
    mean a second one that could drift from it.
    """
    pages = _stored_page_reads(key)
    if not pages:
        return OcrRangeReadOut()
    #: Counted on `text`, not on the number of rows: a page that has only been
    #: *described* (Phase 7.3: `PageRead.caption` with no reading beside it)
    #: has a row here too, and calling it "read" would tell the workspace, the
    #: Files row's badge and the lightbox's page chips that a transcription
    #: exists where none does.
    read = sum(1 for page in pages if (page.text or "").strip())
    return OcrRangeReadOut(
        pages=pages,
        requested=len(pages),
        read=read,
        message=(f"{read} page(s) already read." if read != 1 else "1 page already read."),
    )


class OcrRegionReadOut(BaseModel):
    """One rectangle a person drew on a page, read or described.

    Deliberately *not* `OcrPageReadOut`: nothing here is stored, and a shape
    that carries `page` and looks like a stored page reading would be an
    invitation to file it as one. Asked as a question and it is a good one:
    *"can there be a way for the user to manually outline and single out
    regions on a pdf or similar document and then the ai will read what is in
    those regions?? like maybe the user can outline a graph or diagram on a pdf
    slide and then the user cna get the image or ocr model to analyse and
    caption that thing."*
    """

    #: Which page the rectangle was drawn on, echoed back so the answer can be
    #: labelled with it: a result that does not say where it came from is the
    #: thing the region overlay exists to avoid.
    page: int = 0
    #: "read" or "describe", echoed for the same reason.
    mode: str = "read"
    text: str = ""
    model: str = ""
    message: str = ""


#: A drawn rectangle is a crop of a page render, not an upload: at the viewer's
#: own 2x scale a full page is a few hundred KB and a region is far less. The
#: cap is generous enough never to refuse a real crop and small enough that a
#: mistyped request cannot stream 50 MB into memory before anything looks at it.
MAX_REGION_BYTES = 8 * 1024 * 1024


def _region_image(crop: UploadFile) -> bytes:
    """The uploaded crop's bytes, refused if it is not a PNG or too large.

    **Read into memory rather than streamed to disk**, unlike `/media/upload`:
    nothing here is stored, the model is handed a data URI built from these
    bytes, and writing a scratch file the request then has to clean up is more
    moving parts for no gain. The size cap is what makes that safe.

    The magic-number check is not decoration either: this is the one endpoint
    in the app that takes an image nobody in the notebook uploaded, and
    `canvas.toBlob` produces a PNG, so anything else here is a caller doing
    something other than what this route is for.
    """
    data = crop.file.read(MAX_REGION_BYTES + 1)
    if len(data) > MAX_REGION_BYTES:
        raise HTTPException(status_code=413, detail="That region is too large to read.")
    if not data:
        raise HTTPException(status_code=400, detail="That region came through empty.")
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        raise HTTPException(status_code=415, detail="That region has to be a PNG image.")
    return data


def _read_region(crop: UploadFile, page: int, mode: str, reader: str) -> OcrRegionReadOut:
    """Read or describe one drawn rectangle. Never stores anything.

    **Why the crop is uploaded rather than described by four numbers.** The
    obvious alternative is to send the rectangle and let this render and crop
    the page itself: but the workspace already has the page raster on screen,
    the person drew the rectangle *on that raster*, and cropping it in the
    browser guarantees the model is handed exactly what they outlined. It also
    means the same gesture works on a plain image, which has no page to
    re-render at all.

    **Why nothing is stored.** `PageRead` is keyed by page, and a region is a
    part of a page, several of them, usually, each answering a different
    question. Filing one over the page's reading would destroy a transcription
    to save a note about one chart in the corner of it.
    """
    mode = (mode or "read").strip().lower()
    if mode not in {"read", "describe"}:
        raise HTTPException(
            status_code=400, detail="Pick read or describe."
        )
    data = _region_image(crop)
    if mode == "read":
        reader = _checked_reader(reader)
    local = mode == "read" and reader in LOCAL_READERS
    if local:
        reason = ocr.unavailable_reason(_engine_choice(reader))
        if reason:
            raise HTTPException(status_code=409, detail=reason)
    else:
        if not deps.get_ollama().is_running():
            raise HTTPException(status_code=409, detail="The AI model isn't running.")
    #: A read uses whichever reader the workspace's picker named; a describe is
    #: always the general vision model, for the same reason `_describe_page`
    #: is: a dedicated document reader is tuned to transcribe, not to explain.
    model = (
        "tesseract"
        if local
        else _reader_model(reader)
        if mode == "read"
        else deps.get_model_manager().resolve_vision_model(deps.get_ollama()) or ""
    )
    if not model:
        raise HTTPException(
            status_code=409,
            detail="No installed model can read images. Install or "
            "pick one in Settings → Models.",
        )
    label = "Describing" if mode == "describe" else "Reading"
    token = vision_ocr.register_page_read(
        f"{label} a region of page {page + 1}",
        model=ocr.engine_name(_engine_choice(reader)) if local else model,
    )
    try:
        with tempfile.TemporaryDirectory(prefix="mm-region-") as scratch:
            crop_path = Path(scratch) / "region.png"
            crop_path.write_bytes(data)
            if mode == "describe":
                #: `count=1` and page 0: the prompt's "page N of M" would be a
                #: lie about a crop, and what is wanted here is a description of
                #: the *figure*, which is what the prompt asks for either way.
                text = captioning.page_caption_text(crop_path, 0, 1, model, deps.get_ollama())
            elif local:
                text = (_local_text(crop_path, _engine_choice(reader)) or "").strip()
            else:
                text = (vision_ocr.vision_ocr_text(crop_path, model, deps.get_ollama()) or "").strip()
    finally:
        vision_ocr.finish_page_read(token)
    text = (text or "").strip()
    nothing = (
        f"{model} had nothing to say about that region."
        if mode == "describe"
        else "No text was found in that region."
    )
    return OcrRegionReadOut(
        page=page,
        mode=mode,
        text=text,
        model=model if text else "",
        message="" if text else nothing,
    )


def _forget_page_read(key: tuple[str, int] | None, page: int) -> int | None:
    """Remove one page's stored reading, if there is one.

    **The half of "delete or redo" that redo already had.** Reported directly:
    *"there's also no way to delete or redo ocr text extractions in the ocr
    workspace."* Redo was already there, `PageRead`'s own docstring notes that
    re-reading a page replaces its row rather than appending, it was just
    never labelled as such. Delete genuinely was not: the only way to get rid
    of a wrong reading was to cover it with a better one, which still needs a
    working reader, and there was no way at all to simply take a note off the
    list of "already read" pages.

    Idempotent and quiet either way, matching `_remember_page_read`'s own
    stance that this table is a cache of a reading, not the reading itself, 
    deleting a row that is not there is not an error, it is the state the
    caller wanted.
    """
    if not key:
        return None
    kind, source_id = key
    with deps.get_db().session() as session:
        #: To the bin, not away (WORLD_CLASS_PLAN 28.4 row 2): the row is
        #: copied into `BinnedReading` first, so Undo, and the Library's Bin
        #: after the toast has gone, can put it back.
        binned_id = reading_bin.bin_page(session, kind, source_id, page)
        if binned_id is not None:
            _reindex_file(session, kind, source_id)
            session.commit()
        return binned_id


class ReadingBinnedOut(BaseModel):
    """A whole-file reading moved to the bin: its row there, for Undo."""

    binned_id: int | None = None


_READING_FIELDS = {"tesseract": "ocr_text", "vision": "vision_ocr_text"}


def _bin_file_reading(session: Session, kind: str, source_id: int, source: str) -> ReadingBinnedOut:
    field = _READING_FIELDS.get(source)
    if field is None:
        raise HTTPException(status_code=422, detail="A reading is either tesseract or vision.")
    binned_id = reading_bin.bin_field(session, kind, source_id, field)
    session.commit()
    key = (kind, int(source_id))
    _forget_regions(key)
    with deps.get_db().session() as fresh:
        _reindex_file(fresh, kind, source_id)
        fresh.commit()
    return ReadingBinnedOut(binned_id=binned_id)


class ReadingRestoredOut(BaseModel):
    kind: str
    source_id: int
    field: str
    page: int = 0


def _clean_reading_fields(*fields: tuple[str, str | None]) -> dict[str, str | None]:
    """`vision_ocr.cut_reading_loops` run over each field that is set, as a
    dict of only the ones it actually changed, so a caller commits nothing
    when there was nothing to clean.

    Two fields, not one: a picture read twice (Tesseract once, the vision
    model once) can have the loop in either, and a menu item that only
    checked the one the workspace happens to be showing would leave the
    other one looping forever with no way back to it.
    """
    changed: dict[str, str | None] = {}
    for name, value in fields:
        if not value:
            continue
        cleaned = vision_ocr.cut_reading_loops(value).strip()
        if cleaned != value:
            changed[name] = cleaned or None
    return changed


class VisionOcrBody(BaseModel):
    #: Same "already there and not forced, leave it alone" rule as
    #: `CaptionBody.force`, a manual re-read the user pressed the button
    #: for, not a background pass overwriting a reading they already saw.
    force: bool = False
    #: True only from the workspace's editor: the text is a correction the
    #: person made to the sections on screen, so those sections must stay what
    #: is shown (`_set_edited_reading`). Any other text-setting call (a
    #: fixture, a clear, an import) just replaces the stored text and lets the
    #: sections be derived again.
    edited: bool = False
    #: A correction typed by hand, exactly as `OcrBody.text` already allows for
    #: the Tesseract reading: `None` means "read it", any string sets it, and
    #: `""` clears it.
    #:
    #: Reported: a vision model asked to transcribe a picture with no text in
    #: it returned four Pokémon names, and there was no way to remove or edit
    #: them. That failure is inherent to asking a small VLM to read an image
    #: with nothing to read, the prompt already asks it to say so and it
    #: ignored the instruction: so the fix is not a better prompt, it is that
    #: a wrong reading must be correctable like every other AI output in this
    #: app. The Tesseract line has been editable since it shipped; this one
    #: was the odd one out.
    text: str | None = Field(default=None, max_length=10_000)
