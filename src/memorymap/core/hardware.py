"""How much memory this computer has, for the Models screen's fit badges.

Standard library only: the app does not install psutil for one number. The
answer is the machine's total physical RAM, not what is free right now (free
memory moves every second and a badge that flickers is worse than none).

Linux and macOS answer through `os.sysconf`; Windows through
`GlobalMemoryStatusEx`. `MEMORYMAP_RAM_GB` overrides it, for a container whose
limit is lower than the host's and for tests. None means unknown, and the page
then says so instead of guessing.
"""

from __future__ import annotations

import ctypes
import os
import sys


def total_memory_bytes() -> int | None:
    override = os.getenv("MEMORYMAP_RAM_GB")
    if override:
        try:
            value = float(override)
            if value > 0:
                return int(value * 1024**3)
        except ValueError:
            pass
    try:
        pages = os.sysconf("SC_PHYS_PAGES")
        size = os.sysconf("SC_PAGE_SIZE")
        if pages > 0 and size > 0:
            return int(pages) * int(size)
    except (AttributeError, ValueError, OSError):
        pass
    if sys.platform == "win32":
        return _windows_total()
    return None


def _windows_total() -> int | None:
    class MemoryStatus(ctypes.Structure):
        _fields_ = [
            ("dwLength", ctypes.c_ulong),
            ("dwMemoryLoad", ctypes.c_ulong),
            ("ullTotalPhys", ctypes.c_ulonglong),
            ("ullAvailPhys", ctypes.c_ulonglong),
            ("ullTotalPageFile", ctypes.c_ulonglong),
            ("ullAvailPageFile", ctypes.c_ulonglong),
            ("ullTotalVirtual", ctypes.c_ulonglong),
            ("ullAvailVirtual", ctypes.c_ulonglong),
            ("sullAvailExtendedVirtual", ctypes.c_ulonglong),
        ]

    try:
        status = MemoryStatus()
        status.dwLength = ctypes.sizeof(MemoryStatus)
        if ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(status)):  # type: ignore[attr-defined]
            return int(status.ullTotalPhys)
    except (AttributeError, OSError):
        pass
    return None


def total_memory_gb() -> float | None:
    total = total_memory_bytes()
    return round(total / 1024**3, 1) if total else None
