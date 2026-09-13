"""Reading an uploaded file's text, for the in-app viewer.

The ask was a viewer that opens "all document types", Word files, PDFs,
markdown, code, spreadsheets, CSV, plain text, the way an editor does, rather
than the app's current answer, which is that a file it did not convert on
import is a name in a list.

**The whole design follows from one decision: nothing new is ever served to
the browser inline.** `routes_files.media_file` already carries the reason in
its own comment: an inline PDF viewer is a script host, and the folder it
serves from is not guaranteed to contain only things this app wrote. A viewer
built by widening that endpoint's allowlist and letting the browser render
each new type would inherit that problem once per type added. So the viewer
never receives a file at all: it receives *text*, extracted here, on the
server, and renders it as text. A .docx that is really a zip bomb, a PDF with
an embedded script, an SVG with an onload handler, none of them get near the
renderer, because none of them are what is sent.

That also settles what "editing" can mean at this layer, and it is worth being
plain about rather than discovering later: **extraction is one-way.** Text
pulled out of a .docx is not a .docx, and writing it back would silently
destroy the formatting, images and structure of the original. So a viewed file
is read-only here, and the way to *edit* one is the path the app already has, 
`/import/document` turns it into notes, or its text goes into a document, 
both of which produce something this app owns and can save without lying about
what it is.

Three kinds of file, three ways in:

- **Text already** (.md, .txt, .csv, .json, code): read and decoded here.
  No dependency, always available.
- **A converted document** (.docx, .pdf, .pptx, .xlsx): `entry/importer.py`'s
  markitdown, which the app can already install from Settings → Optional
  extras. Absent, this reports that rather than failing in a way that looks
  broken: the same contract `importer` itself keeps.
- **A scanned page with no text layer**: the vision model's transcription,
  `ai/vision_ocr.py`. Deliberately *not* Tesseract, by direct instruction:
  "I basically dont want to download tesseract and only want to use an ai
  vision learning and ocr model for images and scanned documents." Nothing
  here imports `core/ocr`.

**The third one used to be a dependency gap and no longer is.**
`ai/vision_ocr.py` reads an *image*, and a PDF page is not one until something
rasterises it; this app shipped no rasteriser, so the hook was wired and the
plug did not exist. `core/pdfpages.py` is now that plug, pypdfium2 behind the
`pdfpages` extra, ~16 MB, no system packages and no torch, measured at about
20 ms a page. It stays optional, and with it absent this still reaches the
"probably a scan" message rather than failing: the extras catalogue exists so
that a new dependency is a decision rather than a side effect.
"""

from __future__ import annotations

import re
import zipfile
from dataclasses import dataclass
from html.parser import HTMLParser
from pathlib import Path

from memorymap.core import pdfpages

#: Files that are already text. Read straight off disk and decoded, no
#: converter, no optional package, so these work on a bare install.
#:
#: Grouped by what the viewer does with them rather than alphabetically,
#: because the grouping is the thing a reader needs: `.md` renders as
#: markdown, everything else here renders as monospaced source.
PLAIN_TEXT_SUFFIXES = frozenset({".txt", ".text", ".log", ".csv", ".tsv"})
MARKDOWN_SUFFIXES = frozenset({".md", ".markdown"})
CODE_SUFFIXES = frozenset(
    {
        ".py", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".json", ".yaml",
        ".yml", ".toml", ".ini", ".cfg", ".sh", ".bash", ".zsh", ".sql",
        ".html", ".htm", ".css", ".scss", ".xml", ".rs", ".go", ".java",
        ".c", ".h", ".cpp", ".hpp", ".rb", ".php", ".swift", ".kt", ".r",
        # C#: reachable through the note-attachment picker (ATTACHMENT_SUFFIXES,
        # routes_files.py) but not readable here, so a .cs file could be
        # attached and then had no viewer, no AI reading, and no import path.
        # Every other mainstream language already in this set had all three.
        ".cs",
    }
)

#: A saved web page, for the *import* path only (DOCUMENTS_PLAN Phase 7,
#: "import of .docx/.html to markdown"): somebody who saves an article and
#: imports it wants the article, not its tags.
#:
#: **`extract` deliberately does not convert these.** The viewer's HTML
#: preview pane (`routes_files.attached_file_html_preview`) serves an attached
#: page's own markup through `extract`, inside a sandboxed response with
#: `script-src 'none'`, and that is the one stated exception to "nothing new is
#: ever served inline". Converting here turned that preview into a page
#: showing `# Hi`, which the suite caught (`test_file_editing.py`,
#: "the preview serves the file's own html"). So the conversion belongs to the
#: caller that wants a markdown document, and `html_to_markdown` below is
#: public for exactly that.
HTML_SUFFIXES = frozenset({".html", ".htm"})

#: Files markitdown converts. `.pdf` is here *and* handled specially: a PDF
#: with a text layer converts, a scanned one comes back empty and falls
#: through to the vision model.
CONVERTED_SUFFIXES = frozenset(
    {".pdf", ".docx", ".doc", ".pptx", ".ppt", ".xlsx", ".xls", ".epub", ".rtf", ".odt"}
)

#: Everything the viewer can show. The union, so a caller has one thing to
#: check and cannot end up with a type that passes upload and then has no way
#: to be read.
VIEWABLE_SUFFIXES = (
    PLAIN_TEXT_SUFFIXES | MARKDOWN_SUFFIXES | CODE_SUFFIXES | CONVERTED_SUFFIXES
)

#: How much text one view returns. A viewer is for reading, and a megabyte of
#: extracted text is not read, it is scrolled past once and then paid for on
#: every open. Generous enough for a real chapter or a long spreadsheet, and
#: bounded so a pathological file cannot be a memory problem for the browser.
MAX_VIEW_CHARS = 400_000

#: Text below this from a converted **PDF** means the converter found nothing
#: worth having. Not zero: markitdown returns a line or two of metadata (often
#: just the filename) for a scanned PDF often enough that an `if not text`
#: check would miss the very case this exists to catch.
#:
#: **PDFs only, and that is the whole point of the constant.** The first
#: version applied this floor to every converted type and a test caught it
#: immediately: a real .docx whose text happened to be 36 characters was
#: discarded as "no text found" and reported as a probable scan. A short Word
#: document is a short document, .docx, .pptx and .xlsx do not have a
#: "scanned" failure mode at all, because their text either is in the file or
#: was never there. Only a PDF can be a photograph of a page wearing a
#: document's file extension, so only a PDF needs the floor.
EMPTY_CONVERSION_CHARS = 40


@dataclass
class ViewedFile:
    """What the viewer needs to render one file, and nothing else.

    `kind` says how to render (markdown, code, plain), `source` says where the
    text came from: and `source` is shown to the reader, not just logged: text
    a vision model transcribed off a scanned page is a *reading* of the file,
    and presenting it identically to text read out of a .txt would be the app
    stating a guess as a fact.
    """

    text: str
    kind: str  # "markdown" | "code" | "plain"
    source: str  # "file" | "converted" | "vision-ocr"
    truncated: bool = False
    message: str = ""  # why there is no text, when there is none


#: --- two readers that need nothing installed -------------------------------
#:
#: DOCUMENTS_PLAN Phase 7's import half. Both exist for the same reason: this
#: is an offline notebook, and "install a converter first" is a poor answer to
#: "open the file I just saved". markitdown is still preferred for a .docx
#: where it is present, because it understands tables and footnotes and these
#: do not; what these guarantee is that the file opens *at all*.


class _HtmlToMarkdown(HTMLParser):
    """A saved web page as markdown, in the shapes a person actually reads.

    Headings, paragraphs, lists, quotes, links, emphasis and code. Everything
    else becomes the text inside it, and `<script>`, `<style>`, `<head>` and
    friends become nothing at all: their content is not prose and carrying it
    through would put a page of minified JavaScript in somebody's notebook.

    A parser rather than regular expressions, and the stdlib's rather than a
    dependency: the input is somebody's downloaded web page, so it is
    malformed as often as not, and `html.parser` is built to keep going.
    Nothing here executes or fetches anything; the output is text.
    """

    #: Tags whose *contents* are not prose. Only ones that have a closing tag:
    #: a void element like `<meta>` raises the counter and never lowers it, so
    #: everything after a page's own `<meta charset>` would be dropped and the
    #: page would come back as its own HTML. Measured exactly that way. They
    #: carry no text in any case.
    _DROP = {"script", "style", "head", "noscript", "svg", "iframe"}
    _BLOCK = {"p", "div", "section", "article", "header", "footer", "main", "br", "tr"}
    _HEADINGS = {"h1": 1, "h2": 2, "h3": 3, "h4": 4, "h5": 5, "h6": 6}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.out: list[str] = []
        self._drop = 0
        self._list: list[str] = []
        self._href = ""
        self._link_start = 0

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag in self._DROP:
            self._drop += 1
            return
        if self._drop:
            return
        if tag in self._HEADINGS:
            self._break(2)
            self.out.append("#" * self._HEADINGS[tag] + " ")
        elif tag in {"ul", "ol"}:
            self._break(2)
            self._list.append("-" if tag == "ul" else "1.")
        elif tag == "li":
            self._break(1)
            self.out.append(f"{self._list[-1] if self._list else '-'} ")
        elif tag == "blockquote":
            self._break(2)
            self.out.append("> ")
        elif tag in {"strong", "b"}:
            self.out.append("**")
        elif tag in {"em", "i"}:
            self.out.append("*")
        elif tag == "code":
            self.out.append("`")
        elif tag == "a":
            href = dict(attrs).get("href") or ""
            #: Only an address a markdown reader can follow. `javascript:` and
            #: `data:` in a link are exactly what this app's own
            #: `test_markdown_link_schemes.py` exists to keep out of its text.
            self._href = href if href[:5] in {"http:", "https", "mailt", "/"} or href.startswith("#") else ""
            if self._href:
                self.out.append("[")
                self._link_start = len(self.out)
        elif tag == "img":
            values = dict(attrs)
            src = values.get("src") or ""
            if src and not src.startswith("data:"):
                self.out.append(f"![{values.get('alt') or 'image'}]({src})")
        elif tag in self._BLOCK:
            self._break(2 if tag != "br" else 1)

    def handle_endtag(self, tag: str) -> None:
        if tag in self._DROP:
            self._drop = max(0, self._drop - 1)
            return
        if self._drop:
            return
        if tag in self._HEADINGS or tag in self._BLOCK or tag == "blockquote":
            self._break(2)
        elif tag in {"ul", "ol"}:
            if self._list:
                self._list.pop()
            self._break(2)
        elif tag == "li":
            self._break(1)
        elif tag in {"strong", "b"}:
            self.out.append("**")
        elif tag in {"em", "i"}:
            self.out.append("*")
        elif tag == "code":
            self.out.append("`")
        elif tag == "a" and self._href:
            #: An empty link text would render as `[](url)`, which is a
            #: markdown reader showing nothing you can click.
            if len(self.out) == self._link_start:
                self.out.append(self._href)
            self.out.append(f"]({self._href})")
            self._href = ""

    def handle_data(self, data: str) -> None:
        if self._drop:
            return
        text = re.sub(r"\s+", " ", data)
        if not text.strip():
            #: One space between words that were separated by a line break in
            #: the source, and nothing at the start of a block.
            if self.out and not self.out[-1].endswith((" ", "\n")):
                self.out.append(" ")
            return
        self.out.append(text)

    def _break(self, lines: int) -> None:
        if not self.out:
            return
        tail = "".join(self.out[-3:])
        have = len(tail) - len(tail.rstrip("\n"))
        if have >= lines:
            return
        while self.out and self.out[-1].strip() == "" and not self.out[-1].startswith("\n"):
            self.out.pop()
        self.out.append("\n" * (lines - have))

    def markdown(self) -> str:
        text = "".join(self.out)
        text = re.sub(r"[ \t]+\n", "\n", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip() + "\n" if text.strip() else ""


def html_to_markdown(html: str) -> str:
    """A web page's prose, as markdown. Never raises: a page this cannot parse
    comes back as its own text rather than as an error, because the caller is
    a viewer and an import, and both would rather show something."""
    if not html:
        return ""
    parser = _HtmlToMarkdown()
    try:
        parser.feed(html)
        parser.close()
    except Exception:  # noqa: BLE001
        return html
    out = parser.markdown()
    return out or html.strip()


#: Word's own namespace. One constant because every tag below needs it.
_W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def docx_to_markdown(path: Path) -> str:
    """A .docx read without markitdown and without python-docx.

    A .docx is a zip whose `word/document.xml` holds the paragraphs. This reads
    that part with defusedxml (the file is somebody's upload, so an XML bomb is
    a real shape to refuse rather than a hypothetical) and maps what a person
    would notice: heading styles become `#`, list paragraphs become `-`, bold
    and italic runs keep their markers, and everything else is a paragraph.

    Returns "" for anything it cannot read, which is what puts the caller back
    on its existing "no text found" path rather than a traceback.
    """
    try:
        from defusedxml import ElementTree as DefusedET
    except Exception:  # noqa: BLE001 - defusedxml is a dependency, not an extra
        return ""
    try:
        with zipfile.ZipFile(path) as archive:
            #: A zip bomb refused by size before it is parsed: the document
            #: part of a real .docx is text, and 40 MB of it is not a document.
            info = archive.getinfo("word/document.xml")
            if info.file_size > 40_000_000:
                return ""
            raw = archive.read("word/document.xml")
    except (KeyError, OSError, zipfile.BadZipFile):
        return ""
    try:
        root = DefusedET.fromstring(raw)
    except Exception:  # noqa: BLE001
        return ""

    lines: list[str] = []
    for paragraph in root.iter(f"{_W}p"):
        style = ""
        numbered = False
        properties = paragraph.find(f"{_W}pPr")
        if properties is not None:
            node = properties.find(f"{_W}pStyle")
            if node is not None:
                style = node.get(f"{_W}val") or ""
            numbered = properties.find(f"{_W}numPr") is not None
        pieces: list[str] = []
        for run in paragraph.iter(f"{_W}r"):
            text = "".join(node.text or "" for node in run.iter(f"{_W}t"))
            if not text:
                continue
            run_properties = run.find(f"{_W}rPr")
            bold = run_properties is not None and run_properties.find(f"{_W}b") is not None
            italic = run_properties is not None and run_properties.find(f"{_W}i") is not None
            if bold:
                text = f"**{text}**"
            if italic:
                text = f"*{text}*"
            pieces.append(text)
        body = "".join(pieces).strip()
        if not body:
            #: A blank paragraph is a blank line, which is what keeps two
            #: paragraphs from running together as one.
            if lines and lines[-1] != "":
                lines.append("")
            continue
        match = re.match(r"Heading(\d)", style)
        if match:
            level = min(6, max(1, int(match.group(1))))
            lines.extend([f"{'#' * level} {body}", ""])
        elif style.startswith("Title"):
            lines.extend([f"# {body}", ""])
        elif numbered or style.startswith("List"):
            lines.append(f"- {body}")
        else:
            lines.extend([body, ""])
    out = "\n".join(lines).strip()
    return f"{out}\n" if out else ""


def kind_for(suffix: str) -> str:
    """How the viewer should render a file of this type."""
    suffix = suffix.lower()
    if suffix in MARKDOWN_SUFFIXES:
        return "markdown"
    if suffix in CODE_SUFFIXES:
        return "code"
    if suffix in CONVERTED_SUFFIXES:
        # A converted document comes back *as* markdown, that is what
        # markitdown produces: so it renders the same way a .md does.
        return "markdown"
    return "plain"


def _clip(text: str) -> tuple[str, bool]:
    if len(text) <= MAX_VIEW_CHARS:
        return text, False
    return text[:MAX_VIEW_CHARS], True


def _read_text_file(path: Path) -> str:
    """A text file's contents, decoded forgivingly.

    `errors="replace"` rather than strict: a viewer whose job is to show you
    what is in a file must not refuse the whole file over one bad byte, which
    is what a log written by two different tools routinely contains. The
    replacement character is visible, so nothing is silently altered.
    """
    return path.read_bytes().decode("utf-8", errors="replace")


#: **The files this app may write back**, and the reason the set is smaller
#: than `VIEWABLE_SUFFIXES` is the module docstring's own: extraction is
#: one-way. For these, though, "extraction" is `bytes.decode()`, the text
#: *is* the file: so writing it back is lossless, and refusing to would be
#: refusing the request rather than protecting anything. §R7.1 item 2:
#: *"all the files should be managable, viewable and editable in the library
#: and document/file/text editor"*, with the honest reason in the UI where a
#: file cannot be, rather than a dead end.
EDITABLE_SUFFIXES = PLAIN_TEXT_SUFFIXES | MARKDOWN_SUFFIXES | CODE_SUFFIXES


def editability(path: Path, viewed: ViewedFile) -> tuple[bool, str]:
    """May this file be edited in place, and if not, what does the user get told?

    Answered here rather than at the route, because every fact it turns on, 
    which suffixes are text, what `source` means, what `truncated` means: 
    is defined in this module. A route deciding it independently would be a
    second copy of the format table, and the two would drift.

    The message is written to be *shown*, not logged. A viewer that greys out
    Edit with no explanation is the dead end §R7.1 named; one that says "a
    .docx is not the text pulled out of it" teaches the thing that is actually
    true about the file.
    """
    suffix = path.suffix.lower()
    if suffix not in EDITABLE_SUFFIXES:
        if suffix in CONVERTED_SUFFIXES:
            return False, (
                f"A {suffix} file isn't the text pulled out of it. Saving this back "
                "would replace the document with a plain-text copy, its formatting, "
                "images and layout are not in what you can see here. Import it to a "
                "document if you want a version you can edit."
            )
        return False, f"There's no editor for {suffix or 'this kind of'} files yet."
    if not path.is_file():
        return False, "That file is missing."
    if viewed.truncated:
        return False, (
            f"This file is longer than the {MAX_VIEW_CHARS:,} characters shown, so "
            "saving would drop everything past the end of what you can read here."
        )
    if viewed.source != "file":
        # Belt and braces: a text suffix always yields source="file" today, and
        # if that ever stops being true this refuses rather than overwrites.
        return False, "This text was read out of the file rather than being the file."
    return True, ""


def write_text_file(path: Path, text: str) -> None:
    """Save edited text back over a text file.

    UTF-8 with no BOM, and `newline=""` so the text is written exactly as the
    editor produced it rather than having "\n" translated by the platform, 
    a Windows round trip would otherwise turn every line ending into "\r\n"
    on save and grow the file a little each time.

    Callers must have asked `editability` first; this does not re-check,
    because the route needs the message anyway and a second check here would
    be a second place to keep the rule.
    """
    path.write_text(text, encoding="utf-8", newline="")


def extract(path: Path, vision_reader=None) -> ViewedFile:
    """One file's text, ready to render.

    `vision_reader` is the fallback for a scanned page, a callable taking the
    path and returning its text, or None/"" when it cannot help. Injected
    rather than imported so this module stays free of the AI stack (and so a
    test can exercise the scanned-PDF branch without a model), and optional so
    a caller that does not want a model round trip simply does not pass one.
    """
    suffix = path.suffix.lower()
    if suffix not in VIEWABLE_SUFFIXES:
        return ViewedFile(
            text="",
            kind="plain",
            source="file",
            message=f"There's no viewer for {suffix or 'this kind of'} files yet.",
        )
    if not path.is_file():
        return ViewedFile(
            text="", kind="plain", source="file", message="That file is missing."
        )

    if suffix in CONVERTED_SUFFIXES:
        return _extract_converted(path, suffix, vision_reader)

    text, truncated = _clip(_read_text_file(path))
    return ViewedFile(text=text, kind=kind_for(suffix), source="file", truncated=truncated)


def _extract_converted(path: Path, suffix: str, vision_reader) -> ViewedFile:
    """A .docx/.pdf/.pptx and friends, via markitdown, then vision OCR.

    Order matters and is not arbitrary: conversion is instant and exact where
    it works, and the vision model is slow and is a *reading* rather than the
    text itself. So convert first, and only reach for the model when
    conversion came back with nothing, which is exactly the scanned-page case
    the fallback is for.
    """
    from memorymap.entry import importer

    converted = ""
    if importer.markitdown_available():
        try:
            converted = importer.convert_to_markdown(path)
        except Exception:  # noqa: BLE001
            # A file markitdown cannot parse is a viewer message, never a 500, 
            # the same contract `/import/document` keeps for the same reason.
            converted = ""

    #: **A Word file reads on a bare install too** (Phase 7). markitdown is
    #: better at it and stays first; this is what happens when it is absent,
    #: and before this the answer was a message telling somebody to go and
    #: install something. A .docx is a zip with one XML part in it and this app
    #: already depends on defusedxml, so reading the paragraphs out costs
    #: nothing and works offline, which is the premise of the whole app.
    if not converted.strip() and suffix == ".docx":
        converted = docx_to_markdown(path)

    # A PDF is the only converted type with a "scanned" failure mode, so it is
    # the only one that has to clear a floor rather than merely be non-empty.
    # See EMPTY_CONVERSION_CHARS: applying the floor to every type discarded
    # a real, short .docx as "probably a scan".
    enough = (
        len(converted.strip()) >= EMPTY_CONVERSION_CHARS
        if suffix == ".pdf"
        else bool(converted.strip())
    )
    if enough:
        text, truncated = _clip(converted)
        return ViewedFile(
            text=text, kind="markdown", source="converted", truncated=truncated
        )

    # Nothing usable came out. Before assuming "probably a scan", find out
    # whether PDFium can even open the file, a corrupted, truncated or
    # encrypted PDF fails here with zero pages, which looks identical to a
    # real scan to every check above it but needs a completely different
    # message: no vision model on earth reads a file that can't be decoded
    # at all. This was a real misdiagnosis, caught from a user's own log: 
    # `pdfpages.render_pages` logged "Failed to load document (PDFium: Data
    # format error)" while the viewer told them to go install a vision model.
    if suffix == ".pdf" and pdfpages.available() and pdfpages.page_count(path) == 0:
        return ViewedFile(
            text="",
            kind="plain",
            source="converted",
            message=(
                "This PDF couldn't be opened. It may be corrupted, "
                "password-protected, or saved in a way this app's reader "
                "doesn't support: re-exporting or re-saving it from its "
                "original source usually fixes this."
            ),
        )

    # Two different reasons, and they need two different messages, 
    # "install markitdown" is unhelpful advice for a scanned page, and "this
    # looks like a scan" is wrong when the converter was simply not there.
    if suffix == ".pdf" and vision_reader is not None:
        read = ""
        try:
            read = vision_reader(path) or ""
        except Exception:  # noqa: BLE001  # a viewer must not 500 on a bad file
            read = ""
        if read.strip():
            text, truncated = _clip(read)
            return ViewedFile(
                text=text, kind="plain", source="vision-ocr", truncated=truncated
            )

    if not importer.markitdown_available():
        return ViewedFile(
            text="", kind="plain", source="converted", message=importer.INSTALL_HINT
        )
    # Two different "can't read this", and they need two different next
    # steps. Telling someone to install a rasteriser they already have is as
    # unhelpful as telling them nothing.
    if suffix == ".pdf" and not pdfpages.available():
        return ViewedFile(
            text="",
            kind="plain",
            source="converted",
            message=(
                "There's no text layer in this file, it's probably a scan. "
                "Reading one needs its pages turned into images first: "
                "install “Read scanned PDFs” in Settings → Extras, and pick a "
                "vision or OCR model in Settings → Models."
            ),
        )
    return ViewedFile(
        text="",
        kind="plain",
        source="converted",
        message=(
            "There's no text layer in this file, it's probably a scan. "
            "Reading one needs a vision or OCR model; pick one in "
            "Settings → Models."
        ),
    )
