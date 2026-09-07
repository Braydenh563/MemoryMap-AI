"""Print exact pixel values from a PNG, with no dependencies.

Why this exists: a screenshot you *look at* is not a measurement. Six rounds
were spent on one popup that was reported broken, "fixed", and reported again,
because every round ended by eyeballing a downscaled capture. A vision model
reading one will both invent faint "ghost text" that is not in the pixels and
miss a real 3px clip. Any report about transparency, contrast, a shadow or a
colour looking wrong is settled here instead.

Usage: python3 scratchpad/pngpixel.py FILE [x y] ...
       python3 scratchpad/pngpixel.py FILE --grid   # every Nth pixel as hex
"""
import struct
import sys
import zlib


def read_png(path):
    with open(path, "rb") as handle:
        data = handle.read()
    assert data[:8] == b"\x89PNG\r\n\x1a\n", "not a PNG"
    i, idat, w, h, ct = 8, b"", None, None, None
    while i < len(data):
        ln = struct.unpack(">I", data[i:i + 4])[0]
        typ, chunk = data[i + 4:i + 8], data[i + 8:i + 8 + ln]
        i += 12 + ln
        if typ == b"IHDR":
            w, h, _bd, ct = struct.unpack(">IIBB", chunk[:10])
        elif typ == b"IDAT":
            idat += chunk
        elif typ == b"IEND":
            break
    raw = zlib.decompress(idat)
    ch = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[ct]
    stride, rows, prev, pos = w * ch, [], bytearray(w * ch), 0
    for _ in range(h):
        filt = raw[pos]
        pos += 1
        line = bytearray(raw[pos:pos + stride])
        pos += stride
        for x in range(stride):
            a = line[x - ch] if x >= ch else 0
            b = prev[x]
            c = prev[x - ch] if x >= ch else 0
            if filt == 1:
                line[x] = (line[x] + a) & 255
            elif filt == 2:
                line[x] = (line[x] + b) & 255
            elif filt == 3:
                line[x] = (line[x] + (a + b) // 2) & 255
            elif filt == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[x] = (line[x] + pr) & 255
        rows.append([tuple(line[x * ch:(x + 1) * ch]) for x in range(w)])
        prev = line
    return w, h, rows


def main(argv):
    path = argv[1]
    w, h, rows = read_png(path)
    print(f"{path} {w}x{h}")
    rest = argv[2:]
    if not rest or rest[0] == "--grid":
        step = max(1, w // 24)
        for y in range(0, h, max(1, h // 24)):
            print(y, " ".join("".join("%02x" % c for c in rows[y][x][:3])
                              for x in range(0, w, step)))
        return
    for i in range(0, len(rest) - 1, 2):
        x, y = int(rest[i]), int(rest[i + 1])
        print(x, y, rows[y][x])


if __name__ == "__main__":
    main(sys.argv)
