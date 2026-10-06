"""The import reader behind the needle engine check (INBOX 699).

Synthetic binaries (tests/native_binaries.py) cover each format; nothing here
loads or runs a library, and no test reaches the network.
"""

from __future__ import annotations

import pytest

from memorymap.core import native_imports as ni
from tests.native_binaries import elf64, macho64, macho_fat, pe64

CLEAN_LIBC = ["malloc", "free", "memcpy", "fopen", "pthread_create", "__cxa_atexit"]


def test_elf_clean_engine_has_no_network_calls():
    data = elf64(CLEAN_LIBC, ["libc.so.6", "libm.so.6"])
    symbols, libraries = ni.read_imports(data)
    assert symbols == set(CLEAN_LIBC)
    assert libraries == {"libc.so.6", "libm.so.6"}
    assert ni.network_calls(data) == []


@pytest.mark.parametrize("call", ["socket", "connect", "send", "getaddrinfo", "recvfrom", "gethostbyname"])
def test_elf_network_symbol_is_named(call):
    assert ni.network_calls(elf64([*CLEAN_LIBC, call], ["libc.so.6"])) == [call]


def test_elf_version_suffix_does_not_hide_a_call():
    assert ni.network_calls(elf64(["connect@GLIBC_2.2.5"], [])) == ["connect@GLIBC_2.2.5"]


def test_elf_only_imports_count_not_names_the_library_defines():
    data = elf64(CLEAN_LIBC, ["libc.so.6"], defined=["connect", "socket"])
    assert ni.network_calls(data) == []


def test_elf_network_library_is_named():
    assert ni.network_calls(elf64(CLEAN_LIBC, ["libc.so.6", "libcurl.so.4"])) == ["libcurl.so.4"]


def test_pe_clean_and_network_imports():
    clean = pe64({"KERNEL32.dll": ["CloseHandle", "GetLastError"], "api-ms-win-crt-heap-l1-1-0.dll": ["malloc"]})
    symbols, libraries = ni.read_imports(clean)
    assert symbols == {"CloseHandle", "GetLastError", "malloc"}
    assert "KERNEL32.dll" in libraries
    assert ni.network_calls(clean) == []
    dirty = pe64({"KERNEL32.dll": ["CloseHandle"], "WINHTTP.dll": ["WinHttpOpen"], "WS2_32.dll": ["connect"]})
    assert ni.network_calls(dirty) == ["WINHTTP.dll", "WS2_32.dll", "WinHttpOpen", "connect"]


def test_pe_network_function_alone_is_caught():
    assert ni.network_calls(pe64({"KERNEL32.dll": ["InternetOpenA"]})) == ["InternetOpenA"]


def test_macho_clean_and_network_imports():
    clean = macho64(["_malloc", "_free", "__Unwind_Resume"], ["/usr/lib/libSystem.B.dylib"])
    assert ni.network_calls(clean) == []
    dirty = macho64(["_malloc", "_connect", "_OBJC_CLASS_$_NSURLSession"], ["/usr/lib/libSystem.B.dylib"])
    assert ni.network_calls(dirty) == ["_OBJC_CLASS_$_NSURLSession", "_connect"]


def test_macho_framework_library_is_named_and_defined_names_are_ignored():
    data = macho64(["_malloc"], ["/System/Library/Frameworks/CFNetwork.framework/CFNetwork"], defined=["_socket"])
    assert ni.network_calls(data) == ["/System/Library/Frameworks/CFNetwork.framework/CFNetwork"]


def test_fat_macho_reads_every_slice():
    fat = macho_fat(macho64(["_malloc"], []), macho64(["_getaddrinfo"], []))
    assert ni.network_calls(fat) == ["_getaddrinfo"]


@pytest.mark.parametrize(
    "blob",
    [b"", b"hello", b"\x7fELF", b"MZ", b"\xcf\xfa\xed\xfe", b"\x7fELF" + b"\x02\x01" + b"\0" * 80],
)
def test_unreadable_input_raises_not_crashes(blob):
    with pytest.raises(ni.NotANativeLibrary):
        ni.network_calls(blob)


def test_truncated_real_shapes_raise_not_crash():
    for data in (elf64(CLEAN_LIBC, ["libc.so.6"]), pe64({"K.dll": ["a"]}), macho64(["_a"], ["/x"])):
        for cut in (70, len(data) // 2):
            try:
                ni.read_imports(data[:cut])
            except ni.NotANativeLibrary:
                pass
