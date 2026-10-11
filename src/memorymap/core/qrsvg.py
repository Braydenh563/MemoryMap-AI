"""A QR code of this notebook's network address, as SVG, with no dependency.

WORLD_CLASS_PLAN "Placed from Brief 40" fix 2 and lansafe-1011's leftover:
a phone reaches the notebook by typing `https://192.168.x.y:8443`, which is
the step people get wrong. A QR code beside the address lets the phone's
camera open it. Written here rather than vendored because the need is
small and fixed: byte mode, error correction level M, versions 1 to 10 (up
to 213 bytes; the longest address the app shows, a bracketed IPv6 with a
port, is under 60). The encoder follows ISO/IEC 18004: Reed-Solomon over
GF(256) with 0x11D, the eight masks scored by the four penalty rules.
`tests/test_qrsvg.py` holds it to a reference encoder's matrices.
"""

from __future__ import annotations

#: Level M, per version (index 0 unused): error-correction codewords per
#: block, and how many blocks.
_ECC_PER_BLOCK = (0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26)
_BLOCKS = (0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5)
MAX_VERSION = 10
#: Level M's two format bits (L 01, M 00, Q 11, H 10).
_ECL_BITS = 0


def _raw_modules(version: int) -> int:
    """Modules left for data after the function patterns."""
    result = (16 * version + 128) * version + 64
    if version >= 2:
        align = version // 7 + 2
        result -= (25 * align - 10) * align - 55
        if version >= 7:
            result -= 36
    return result


def _data_codewords(version: int) -> int:
    return _raw_modules(version) // 8 - _ECC_PER_BLOCK[version] * _BLOCKS[version]


def _gf_mul(x: int, y: int) -> int:
    z = 0
    for i in range(7, -1, -1):
        z = (z << 1) ^ ((z >> 7) * 0x11D)
        z ^= ((y >> i) & 1) * x
    return z & 0xFF


def _rs_divisor(degree: int) -> list[int]:
    result = [0] * (degree - 1) + [1]
    root = 1
    for _ in range(degree):
        for j in range(degree):
            result[j] = _gf_mul(result[j], root)
            if j + 1 < degree:
                result[j] ^= result[j + 1]
        root = _gf_mul(root, 0x02)
    return result


def _rs_remainder(data: list[int], divisor: list[int]) -> list[int]:
    result = [0] * len(divisor)
    for byte in data:
        factor = byte ^ result.pop(0)
        result.append(0)
        for i, coef in enumerate(divisor):
            result[i] ^= _gf_mul(coef, factor)
    return result


def _alignment_positions(version: int) -> list[int]:
    if version == 1:
        return []
    count = version // 7 + 2
    step = (version * 8 + count * 3 + 5) // (count * 4 - 4) * 2
    return [6] + [version * 4 + 10 - i * step for i in range(count - 1)][::-1]


class _Matrix:
    def __init__(self, version: int) -> None:
        self.version = version
        self.size = version * 4 + 17
        self.dark = [[False] * self.size for _ in range(self.size)]
        self.fixed = [[False] * self.size for _ in range(self.size)]

    def put(self, x: int, y: int, dark: bool) -> None:
        self.dark[y][x] = dark
        self.fixed[y][x] = True

    def function_patterns(self) -> None:
        size = self.size
        for i in range(size):
            self.put(6, i, i % 2 == 0)
            self.put(i, 6, i % 2 == 0)
        for cx, cy in ((3, 3), (size - 4, 3), (3, size - 4)):
            self._finder(cx, cy)
        self._alignment_patterns()
        self.format_bits(0)
        self.version_bits()

    def _finder(self, cx: int, cy: int) -> None:
        """One finder pattern and its separator, centred at (cx, cy)."""
        for dy in range(-4, 5):
            for dx in range(-4, 5):
                x, y = cx + dx, cy + dy
                if 0 <= x < self.size and 0 <= y < self.size:
                    self.put(x, y, max(abs(dx), abs(dy)) not in (2, 4))

    def _alignment_patterns(self) -> None:
        """The small squares, everywhere but on the three finders."""
        positions = _alignment_positions(self.version)
        last = len(positions) - 1
        for i, ax in enumerate(positions):
            for j, ay in enumerate(positions):
                if (i == 0 and j == 0) or (i == 0 and j == last) or (i == last and j == 0):
                    continue
                for dy in range(-2, 3):
                    for dx in range(-2, 3):
                        self.put(ax + dx, ay + dy, max(abs(dx), abs(dy)) != 1)

    def format_bits(self, mask: int) -> None:
        data = _ECL_BITS << 3 | mask
        rem = data
        for _ in range(10):
            rem = (rem << 1) ^ ((rem >> 9) * 0x537)
        bits = (data << 10 | rem) ^ 0x5412
        size = self.size
        for i in range(6):
            self.put(8, i, (bits >> i) & 1 == 1)
        self.put(8, 7, (bits >> 6) & 1 == 1)
        self.put(8, 8, (bits >> 7) & 1 == 1)
        self.put(7, 8, (bits >> 8) & 1 == 1)
        for i in range(9, 15):
            self.put(14 - i, 8, (bits >> i) & 1 == 1)
        for i in range(8):
            self.put(size - 1 - i, 8, (bits >> i) & 1 == 1)
        for i in range(8, 15):
            self.put(8, size - 15 + i, (bits >> i) & 1 == 1)
        self.put(8, size - 8, True)

    def version_bits(self) -> None:
        if self.version < 7:
            return
        rem = self.version
        for _ in range(12):
            rem = (rem << 1) ^ ((rem >> 11) * 0x1F25)
        bits = self.version << 12 | rem
        for i in range(18):
            dark = (bits >> i) & 1 == 1
            a, b = self.size - 11 + i % 3, i // 3
            self.put(a, b, dark)
            self.put(b, a, dark)

    def codewords(self, data: list[int]) -> None:
        i = 0
        size = self.size
        right = size - 1
        while right >= 1:
            if right == 6:
                right = 5
            for vert in range(size):
                for j in range(2):
                    x = right - j
                    upward = (right + 1) & 2 == 0
                    y = size - 1 - vert if upward else vert
                    if not self.fixed[y][x] and i < len(data) * 8:
                        self.dark[y][x] = (data[i >> 3] >> (7 - (i & 7))) & 1 == 1
                        i += 1
            right -= 2

    def apply_mask(self, mask: int) -> None:
        tests = (
            lambda x, y: (x + y) % 2 == 0,
            lambda x, y: y % 2 == 0,
            lambda x, y: x % 3 == 0,
            lambda x, y: (x + y) % 3 == 0,
            lambda x, y: (x // 3 + y // 2) % 2 == 0,
            lambda x, y: x * y % 2 + x * y % 3 == 0,
            lambda x, y: (x * y % 2 + x * y % 3) % 2 == 0,
            lambda x, y: ((x + y) % 2 + x * y % 3) % 2 == 0,
        )
        test = tests[mask]
        for y in range(self.size):
            for x in range(self.size):
                if not self.fixed[y][x] and test(x, y):
                    self.dark[y][x] = not self.dark[y][x]

    def penalty(self) -> int:
        size = self.size
        grid = self.dark
        lines = [row[:] for row in grid] + [[grid[y][x] for y in range(size)] for x in range(size)]
        score = sum(_run_penalty(line) + _finder_penalty(line) for line in lines)
        for y in range(size - 1):
            for x in range(size - 1):
                c = grid[y][x]
                if c == grid[y][x + 1] == grid[y + 1][x] == grid[y + 1][x + 1]:
                    score += 3
        dark = sum(sum(row) for row in grid)
        total = size * size
        k = (abs(dark * 20 - total * 10) + total - 1) // total - 1
        return score + k * 10


def _run_penalty(line: list[bool]) -> int:
    """Rule 1: a run of five or more alike scores 3 plus one for each beyond five."""
    score, run = 0, 1
    for i in range(1, len(line) + 1):
        if i < len(line) and line[i] == line[i - 1]:
            run += 1
            continue
        if run >= 5:
            score += 3 + run - 5
        run = 1
    return score


def _finder_penalty(line: list[bool]) -> int:
    """Rule 3: the finder's 1:1:3:1:1 with four light modules on a side, the
    light side allowed to run past the edge."""
    finder = (True, False, True, True, True, False, True)
    score = 0
    padded = [False] * 4 + line + [False] * 4
    for i in range(len(padded) - 6):
        if tuple(padded[i:i + 7]) != finder:
            continue
        before = padded[max(0, i - 4):i]
        after = padded[i + 7:i + 11]
        if (len(before) == 4 and not any(before)) or (len(after) == 4 and not any(after)):
            score += 40
    return score


def encode(text: str, mask: int | None = None) -> list[list[bool]]:
    """The QR matrix for `text` (UTF-8, byte mode, level M): rows of
    booleans, True dark, without the quiet zone. `mask` forces one of the
    eight masks (for tests); otherwise the lowest penalty wins."""
    payload = text.encode("utf-8")
    version, count_bits = _version_for(len(payload))
    interleaved = _interleaved_codewords(version, _data_bits(payload, version, count_bits))
    matrix = _Matrix(version)
    matrix.function_patterns()
    matrix.codewords(interleaved)
    if mask is None:
        mask = _best_mask(matrix)
    matrix.apply_mask(mask)
    matrix.format_bits(mask)
    return matrix.dark


def _version_for(length: int) -> tuple[int, int]:
    """The smallest QR version that holds `length` bytes, with its count field width."""
    for version in range(1, MAX_VERSION + 1):
        count_bits = 8 if version <= 9 else 16
        if 4 + count_bits + length * 8 <= _data_codewords(version) * 8:
            return version, count_bits
    raise ValueError("too long for a QR code here")


def _data_bits(payload: bytes, version: int, count_bits: int) -> list[int]:
    """Mode, length, bytes, terminator and the alternating pad bytes, as bits."""
    capacity = _data_codewords(version) * 8
    bits: list[int] = []

    def append(value: int, length: int) -> None:
        bits.extend((value >> i) & 1 for i in range(length - 1, -1, -1))

    append(0b0100, 4)
    append(len(payload), count_bits)
    for byte in payload:
        append(byte, 8)
    append(0, min(4, capacity - len(bits)))
    append(0, (8 - len(bits) % 8) % 8)
    pad = 0xEC
    while len(bits) < capacity:
        append(pad, 8)
        pad ^= 0xEC ^ 0x11
    return bits


def _interleaved_codewords(version: int, bits: list[int]) -> list[int]:
    """The data codewords with their error-correction blocks, interleaved."""
    data = [int("".join(map(str, bits[i:i + 8])), 2) for i in range(0, len(bits), 8)]
    blocks_n = _BLOCKS[version]
    ecc_len = _ECC_PER_BLOCK[version]
    raw_codewords = _raw_modules(version) // 8
    short_count = blocks_n - raw_codewords % blocks_n
    short_len = raw_codewords // blocks_n
    divisor = _rs_divisor(ecc_len)
    blocks = []
    k = 0
    for i in range(blocks_n):
        length = short_len - ecc_len + (0 if i < short_count else 1)
        chunk = data[k:k + length]
        k += length
        ecc = _rs_remainder(chunk, divisor)
        if i < short_count:
            chunk = chunk + [0]
        blocks.append(chunk + ecc)
    interleaved = []
    for i in range(len(blocks[0])):
        for j, block in enumerate(blocks):
            if i != short_len - ecc_len or j >= short_count:
                interleaved.append(block[i])
    return interleaved


def _best_mask(matrix: "_Matrix") -> int:
    """The mask (0 to 7) with the lowest penalty."""
    best = None
    for candidate in range(8):
        matrix.apply_mask(candidate)
        matrix.format_bits(candidate)
        score = matrix.penalty()
        if best is None or score < best[0]:
            best = (score, candidate)
        matrix.apply_mask(candidate)
    return best[1]


def svg(text: str, *, quiet: int = 4) -> str:
    """The code as one SVG path, black on white whatever the theme (a
    camera reads dark on light), sized by its viewBox."""
    rows = encode(text)
    size = len(rows) + quiet * 2
    parts = []
    for y, row in enumerate(rows):
        x = 0
        while x < len(row):
            if row[x]:
                start = x
                while x < len(row) and row[x]:
                    x += 1
                parts.append(f"M{start + quiet} {y + quiet}h{x - start}v1h-{x - start}z")
            else:
                x += 1
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" '
        f'shape-rendering="crispEdges" role="img">'
        f'<rect width="{size}" height="{size}" fill="#fff"/>'
        f'<path fill="#000" d="{"".join(parts)}"/></svg>'
    )
