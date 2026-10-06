"""Tiny synthetic ELF, PE and Mach-O libraries for the import reader's tests.

Each builder writes only what `core/native_imports.py` reads: a symbol table
(or import directory) naming the imported functions and the libraries. They
are not loadable binaries, which is the point: nothing here can run.
"""

from __future__ import annotations

import struct


def elf64(symbols: list[str], libraries: list[str] | None = None, defined: list[str] | None = None) -> bytes:
    libraries = libraries or []
    defined = defined or []
    strtab = b"\0"
    offsets = {}
    for name in [*symbols, *defined, *libraries]:
        offsets[name] = len(strtab)
        strtab += name.encode() + b"\0"
    dynsym = b"\0" * 24
    for name in symbols:  # undefined: shndx 0
        dynsym += struct.pack("<IBBHQQ", offsets[name], 0x12, 0, 0, 0, 0)
    for name in defined:  # defined in section 1
        dynsym += struct.pack("<IBBHQQ", offsets[name], 0x12, 0, 1, 0x1000, 8)
    dynamic = b"".join(struct.pack("<qQ", 1, offsets[lib]) for lib in libraries) + struct.pack("<qQ", 0, 0)
    sym_off = 64
    str_off = sym_off + len(dynsym)
    dyn_off = str_off + len(strtab)
    shoff = dyn_off + len(dynamic)

    def shdr(typ, off, size, link, entsize):
        return struct.pack("<IIQQQQIIQQ", 0, typ, 0, 0, off, size, link, 0, 8, entsize)

    # null, .dynsym (type 11, link 2), .dynstr (type 3), .dynamic (type 6, link 2)
    sections = (
        b"\0" * 64
        + shdr(11, sym_off, len(dynsym), 2, 24)
        + shdr(3, str_off, len(strtab), 0, 0)
        + shdr(6, dyn_off, len(dynamic), 2, 16)
    )
    header = bytearray(64)
    header[0:4] = b"\x7fELF"
    header[4], header[5], header[6] = 2, 1, 1
    struct.pack_into("<Q", header, 0x28, shoff)
    struct.pack_into("<HH", header, 0x3A, 64, 4)
    return bytes(header) + dynsym + strtab + dynamic + sections


def pe64(imports: dict[str, list[str]]) -> bytes:
    """`imports` maps a DLL name to the function names imported from it."""
    rva_base, raw_base = 0x1000, 0x400
    blob = bytearray()
    desc_size = 20 * (len(imports) + 1)
    blob += b"\0" * desc_size
    descriptors = []
    for dll, funcs in imports.items():
        name_at = len(blob)
        blob += dll.encode() + b"\0"
        if len(blob) % 2:
            blob += b"\0"
        hints = []
        for fn in funcs:
            hints.append(len(blob))
            blob += b"\0\0" + fn.encode() + b"\0"
            if len(blob) % 2:
                blob += b"\0"
        thunks_at = len(blob)
        for h in hints:
            blob += struct.pack("<Q", rva_base + h)
        blob += struct.pack("<Q", 0)
        descriptors.append((thunks_at, name_at))
    for i, (thunks_at, name_at) in enumerate(descriptors):
        struct.pack_into("<IIIII", blob, i * 20, rva_base + thunks_at, 0, 0, rva_base + name_at, rva_base + thunks_at)
    dos = bytearray(0x40)
    dos[0:2] = b"MZ"
    struct.pack_into("<I", dos, 0x3C, 0x40)
    coff = struct.pack("<HHIIIHH", 0x8664, 1, 0, 0, 0, 240, 0x2000)
    opt = bytearray(240)
    struct.pack_into("<H", opt, 0, 0x20B)
    struct.pack_into("<II", opt, 112 + 8, rva_base, desc_size)  # data directory 1: imports
    section = struct.pack("<8sIIIIIIHHI", b".idata", len(blob), rva_base, len(blob), raw_base, 0, 0, 0, 0, 0x40000040)
    head = bytes(dos) + b"PE\0\0" + coff + bytes(opt) + section
    return head + b"\0" * (raw_base - len(head)) + bytes(blob)


def macho64(symbols: list[str], libraries: list[str] | None = None, defined: list[str] | None = None) -> bytes:
    libraries = libraries or []
    defined = defined or []
    strtab = b"\0"
    offsets = {}
    for name in [*symbols, *defined]:
        offsets[name] = len(strtab)
        strtab += name.encode() + b"\0"
    nlist = b"".join(struct.pack("<IBBHQ", offsets[n], 0x01, 0, 0, 0) for n in symbols)  # N_EXT, undefined
    nlist += b"".join(struct.pack("<IBBHQ", offsets[n], 0x0F, 1, 0, 0x1000) for n in defined)  # N_EXT|N_SECT
    dylibs = b""
    for lib in libraries:
        raw = lib.encode() + b"\0"
        raw += b"\0" * (-(24 + len(raw)) % 8)
        dylibs += struct.pack("<IIIIII", 0xC, 24 + len(raw), 24, 0, 0, 0) + raw
    ncmds = len(libraries) + 1
    cmds_size = len(dylibs) + 24
    symoff = 32 + cmds_size
    stroff = symoff + len(nlist)
    symtab = struct.pack("<IIIIII", 0x2, 24, symoff, len(symbols) + len(defined), stroff, len(strtab))
    header = struct.pack("<IiiIIIII", 0xFEEDFACF, 0x0100000C, 0, 6, ncmds, cmds_size, 0, 0)
    return header + dylibs + symtab + nlist + strtab


def macho_fat(*slices: bytes) -> bytes:
    head = struct.pack(">II", 0xCAFEBABE, len(slices))
    offset = 8 + 20 * len(slices)
    table = b""
    body = b""
    for blob in slices:
        table += struct.pack(">iiIII", 0x0100000C, 0, offset, len(blob), 14)
        body += blob
        offset += len(blob)
    return head + table + body
