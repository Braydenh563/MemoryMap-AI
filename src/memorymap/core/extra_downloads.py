"""The second kind of optional extra: a pinned download (INBOX 404, 302).

The owner, 2026-09-24, on two decisions the repository read and the code
editor's Run button had left open: "Run Python files: yes, as an opt-in
extra" and, for needle, "Yes, as an extra". Neither one is a pip package.
Pyodide is a WebAssembly build of CPython that runs in the browser, shipped
as a release archive; needle is a native engine and a weights file on
Hugging Face. `core/extras.py` installed pip packages only, so this is the
other kind, behind the same routes, the same Settings row and the same
one-at-a-time state.

**What an entry is.** A `Download` is a URL, the file's sha256 and its size,
all written down in `extras.py` beside the entry, and an unpack step: the
file as it is, or named members out of a tar or zip archive, each written to
a name the entry chose. Nothing about it is looked up at run time, which is
the same property the pip allowlist has: the request picks an entry, never a
URL.

**The properties, each tested in `tests/test_extras_download.py`:**

- **Network only on the install click.** Nothing here runs at start-up or on
  a status read; `status` is a look at a folder on disk. Once installed the
  files are served from the data dir and nothing asks again.
- **The hash is the gate.** A file is streamed to a staging folder while it
  is hashed, and a file whose sha256 is not the pinned one is deleted and the
  install fails, with nothing of it kept. A file that grows past its pinned
  size is cut off rather than read to the end, so a wrong URL cannot fill a
  disk before the hash gets a say.
- **An archive cannot choose where its files go.** Only the members the entry
  names are read, each through `extractfile`/`open` into a name that is a
  plain file name (checked when the `Download` is built), so a `../` in an
  archive has nowhere to go; `extractall` is never called.
- **All or nothing.** Every download lands and is checked in the staging
  folder first; only then is the folder moved into place, with a marker file
  that records the version. A cancelled or failed install leaves the
  previous state as it was.
- **HTTPS only**, except for a loopback address, which is what the tests'
  fake file server and a local mirror use.
"""

from __future__ import annotations

import hashlib
import ipaddress
import json
import os
import platform as _platform
import re
import shutil
import sys
import tarfile
import time
import urllib.request
import zipfile
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse


#: The file that says an install finished, and which version it was.
MARKER = "installed.json"

#: A written name: a plain file name, nothing that could be a path.
_NAME_RE = re.compile(r"[A-Za-z0-9._-]+")

#: How much is read at a time, and how often the progress line changes.
_CHUNK = 256 * 1024


@dataclass(frozen=True)
class Download:
    """One pinned file, and what to take out of it."""

    url: str
    sha256: str
    #: The file's size in bytes. A download that grows past it is cut off.
    size: int
    #: "file" (written as it is), "tar" (any compression tarfile reads) or "zip".
    unpack: str
    #: (member in the archive, name to write it as). For "file" the member is
    #: "" and there is one pair.
    members: tuple[tuple[str, str], ...]
    #: A `platform_key()` this file is for, or "" for every platform.
    platform: str = ""

    def __post_init__(self) -> None:
        if self.unpack not in {"file", "tar", "zip"}:
            raise ValueError(f"unknown unpack step {self.unpack!r}")
        if not self.members:
            raise ValueError("a download names at least one file to keep")
        for _member, name in self.members:
            if not _NAME_RE.fullmatch(name or "") or name in {".", ".."}:
                raise ValueError(f"{name!r} is not a plain file name")


def platform_key() -> str:
    """This computer, in the words the download table uses.

    `linux-x86_64`, `linux-x86_64-musl`, `linux-aarch64`, `macos-arm64`,
    `macos-x86_64`, `windows-x86_64`, `windows-arm64`; anything else comes
    back as `<sys.platform>-<machine>` so the "not built for" message can
    name it.
    """
    machine = (_platform.machine() or "").lower()
    arch = {"amd64": "x86_64", "x64": "x86_64", "arm64": "aarch64"}.get(machine, machine)
    if sys.platform == "darwin":
        return "macos-arm64" if arch == "aarch64" else f"macos-{arch}"
    if sys.platform == "win32":
        return "windows-arm64" if arch == "aarch64" else f"windows-{arch}"
    if sys.platform.startswith("linux"):
        return f"linux-{arch}-musl" if _is_musl() else f"linux-{arch}"
    return f"{sys.platform}-{arch}"


def _is_musl() -> bool:
    """A musl libc (Alpine), which needs its own build of a native library.
    Read from the loader's own mapping first, as needle's fetcher does,
    because `platform.libc_ver()` misreports on some musl builds."""
    try:
        with open("/proc/self/maps", "rb") as maps:
            blob = maps.read()
        if b"musl" in blob:
            return True
        if b"/libc.so.6" in blob or b"/ld-linux" in blob:
            return False
    except OSError:
        pass
    return not _platform.libc_ver()[0]


def downloads_for(extra) -> list[Download]:
    """The files this computer needs: every shared one, plus its platform's."""
    key = platform_key()
    return [d for d in extra.downloads if not d.platform or d.platform == key]


def platform_reason(extra) -> str:
    """Why this extra cannot be installed here, or "".

    An entry with platform-specific files and none for this computer is not
    offered: its Install button is greyed with this sentence beside it, and
    `extras.start` refuses it, the same two places `unavailable` is held.
    """
    built = sorted({d.platform for d in extra.downloads if d.platform})
    if not built or platform_key() in built:
        return ""
    return (
        f"There is no prebuilt engine for this computer ({platform_key()}). "
        f"It is built for {', '.join(built)}."
    )


def url_allowed(url: str) -> bool:
    """HTTPS anywhere, or plain HTTP to this machine (a local mirror, or the
    tests' fake file server). Nothing else, `file:` included."""
    try:
        parsed = urlparse(url)
    except ValueError:
        return False
    if parsed.scheme == "https" and parsed.hostname:
        return True
    if parsed.scheme != "http" or not parsed.hostname:
        return False
    if parsed.hostname == "localhost":
        return True
    try:
        return ipaddress.ip_address(parsed.hostname).is_loopback
    except ValueError:
        return False


def root_dir() -> Path:
    """`<data dir>/extras`, beside the notes: one place per notebook, and
    removing the data folder removes them with it."""
    from memorymap.core.config import ConfigManager

    return ConfigManager().data_dir / "extras"


def folder(extra) -> Path:
    return root_dir() / extra.id


def is_installed(extra) -> bool:
    """The marker says this version finished, and every file it names is
    there. A disk look, never a network one."""
    target = folder(extra)
    try:
        marker = json.loads((target / MARKER).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return False
    if not isinstance(marker, dict) or marker.get("version") != extra.version:
        return False
    return all((target / name).is_file() for name in marker.get("files") or [])


def ready(extra_id: str) -> Path | None:
    """The installed folder of `extra_id`, or None. What the features that
    use a download extra ask, so none of them imports anything to find out."""
    from memorymap.core import extras

    extra = extras.EXTRAS_BY_ID.get(extra_id)
    if extra is None or extra.kind != "download" or not is_installed(extra):
        return None
    return folder(extra)


def source(extra) -> str:
    """Where the first file comes from, for the confirm dialog: a host name."""
    wanted = downloads_for(extra) or list(extra.downloads)
    if not wanted:
        return ""
    return urlparse(wanted[0].url).hostname or ""


#: A folder of the same files somewhere this machine can reach, for a
#: computer with no internet (copy the files over, serve the folder) and for
#: the browser sweep, which installs from a local copy. Only the address
#: changes: the file is still looked up by its own name, still checked
#: against the pinned hash, and the mirror must be HTTPS or this machine.
MIRROR_ENV = "MEMORYMAP_EXTRAS_MIRROR"


def effective_url(download: Download) -> str:
    """The pinned URL, or the same file name under `MEMORYMAP_EXTRAS_MIRROR`."""
    mirror = os.environ.get(MIRROR_ENV, "").strip().rstrip("/")
    if not mirror:
        return download.url
    return f"{mirror}/{download.url.rsplit('/', 1)[-1]}"


def _open_url(url: str):
    """The one place a download extra touches the network. Proxies come from
    the environment, as they do for pip, so a machine behind one works."""
    request = urllib.request.Request(url, headers={"User-Agent": "MemoryMap"})
    return urllib.request.urlopen(request, timeout=60)  # noqa: S310  # scheme checked by url_allowed


class DownloadFailed(Exception):
    """A reason fit to show: never a path, never a stack."""


def _mb(n: float) -> str:
    return f"{n / 1_000_000:.1f}"


def _fetch(download: Download, dest: Path, state, label: str) -> None:
    """Stream one file to `dest`, hashing as it goes; raise on a mismatch."""
    url = effective_url(download)
    if not url_allowed(url):
        raise DownloadFailed("That download address is not allowed.")
    digest = hashlib.sha256()
    received = 0
    last = 0.0
    with _open_url(url) as response, open(dest, "wb") as out:
        while True:
            if state.cancelled:
                raise DownloadFailed("Stopped before it finished.")
            chunk = response.read(_CHUNK)
            if not chunk:
                break
            received += len(chunk)
            if received > download.size:
                raise DownloadFailed(
                    f"{label}: the file is bigger than the pinned {_mb(download.size)} MB, "
                    "so it is not the file this version expects."
                )
            digest.update(chunk)
            out.write(chunk)
            now = time.monotonic()
            if now - last > 0.25:
                last = now
                state.step = f"Downloading {label}: {_mb(received)} of {_mb(download.size)} MB"
    if digest.hexdigest() != download.sha256:
        raise DownloadFailed(
            f"{label}: the checksum does not match the pinned one, so the file "
            "was not kept. Try again; if it keeps happening the download is not "
            "the file this version expects."
        )


def _unpack(download: Download, fetched: Path, staging: Path) -> list[str]:
    """Write the named members into `staging`. Returns the names written."""
    written = []
    if download.unpack == "file":
        name = download.members[0][1]
        fetched.replace(staging / name)
        return [name]
    try:
        if download.unpack == "tar":
            with tarfile.open(fetched, "r:*") as archive:
                for member, name in download.members:
                    info = archive.getmember(member)
                    handle = archive.extractfile(info) if info.isfile() else None
                    if handle is None:
                        raise KeyError(member)
                    with handle, open(staging / name, "wb") as out:
                        shutil.copyfileobj(handle, out)
                    written.append(name)
        else:
            with zipfile.ZipFile(fetched) as archive:
                for member, name in download.members:
                    with archive.open(member) as handle, open(staging / name, "wb") as out:
                        shutil.copyfileobj(handle, out)
                    written.append(name)
    except KeyError as exc:
        raise DownloadFailed(
            f"The archive has no {exc.args[0] if exc.args else 'expected file'} in it, "
            "so it is not the one this version expects."
        ) from exc
    except (tarfile.TarError, zipfile.BadZipFile, EOFError) as exc:
        raise DownloadFailed("The archive could not be read.") from exc
    finally:
        fetched.unlink(missing_ok=True)
    return written


def install(extra, state) -> None:
    """Download, check and unpack every file, then move the folder into
    place. Raises `DownloadFailed` with a reason fit to show."""
    wanted = downloads_for(extra)
    if not wanted:
        raise DownloadFailed(platform_reason(extra) or "Nothing to download.")
    root = root_dir()
    root.mkdir(parents=True, exist_ok=True)
    staging = root / f".{extra.id}.staging"
    shutil.rmtree(staging, ignore_errors=True)
    staging.mkdir()
    try:
        files: list[str] = []
        for number, download in enumerate(wanted, start=1):
            label = extra.short_label or extra.label
            if len(wanted) > 1:
                label = f"{label} ({number} of {len(wanted)})"
            fetched = staging / ".download.part"
            _fetch(download, fetched, state, label)
            state.step = f"Unpacking {label}"
            files += _unpack(download, fetched, staging)
            state.log.append(f"{download.url} sha256 {download.sha256} ok")
        (staging / MARKER).write_text(
            json.dumps({"version": extra.version, "files": files, "platform": platform_key()}),
            encoding="utf-8",
        )
        target = folder(extra)
        old = root / f".{extra.id}.old"
        shutil.rmtree(old, ignore_errors=True)
        if target.exists():
            target.replace(old)
        staging.replace(target)
        shutil.rmtree(old, ignore_errors=True)
    finally:
        shutil.rmtree(staging, ignore_errors=True)


def uninstall(extra) -> None:
    """Remove the folder. Idempotent: a folder already gone is removed."""
    target = folder(extra)
    if target.exists():
        shutil.rmtree(target)
