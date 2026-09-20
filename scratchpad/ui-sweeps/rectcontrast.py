"""The contrast of one rectangle of a capture, from its own pixels.

    python3 scratchpad/ui-sweeps/rectcontrast.py shot.png X Y W H

Prints one number: the WCAG ratio between the darkest and the lightest pixel
inside that rectangle. Given the box of a line of text, that is the ink against
the surface it is drawn on.

Why this exists rather than another composite of computed styles: a composite
has to guess what is behind a translucent surface, and in this app the answer
is often a gradient, a `background-image` with a transparent `background-color`
behind it. `tour.js`'s first contrast check did exactly that and reported
1.21:1 for white text in the dark theme, having walked the ancestors, found no
opaque colour and fallen back to white. The pixels cannot make that mistake.

What it is not: a per-glyph measurement. Antialiasing means the darkest pixel
of a thin glyph is a shade off the declared colour, so this reads very slightly
optimistic on light text and very slightly pessimistic on dark; and a box that
holds something other than text (an icon, an image) is measuring that instead.
Give it the box of a text node and read it as the number contrast.js would
report if it could see the surface.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pngpixel import read_png  # noqa: E402  (after the path is set up)


def _linear(value):
    channel = value / 255
    return channel / 12.92 if channel <= 0.03928 else ((channel + 0.055) / 1.055) ** 2.4


def luminance(pixel):
    return (
        0.2126 * _linear(pixel[0])
        + 0.7152 * _linear(pixel[1])
        + 0.0722 * _linear(pixel[2])
    )


def main(argv):
    path = argv[1]
    x, y, w, h = (int(value) for value in argv[2:6])
    width, height, rows = read_png(path)
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(width, x + w), min(height, y + h)
    if x1 <= x0 or y1 <= y0:
        print("0")
        return
    values = [
        luminance(rows[row][column])
        for row in range(y0, y1)
        for column in range(x0, x1)
    ]
    low, high = min(values), max(values)
    print(round((high + 0.05) / (low + 0.05), 2))


if __name__ == "__main__":
    main(sys.argv)
