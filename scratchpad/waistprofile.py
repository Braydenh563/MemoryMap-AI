"""Luminance down a column of an atlaswaist.js shot, and its largest step.

A seam at the waist is a step in brightness over a few pixels where the torso
ends and the wisps begin; a blend is a ramp. Prints the biggest change over a
4px window between y0 and y1 at each x, so a before and an after compare as
numbers rather than impressions.

Usage: python3 scratchpad/waistprofile.py SHOT.png [x ...] [--y 170 250]
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from pngpixel import read_png  # noqa: E402


def luminance(px):
    r, g, b = px[:3]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def main(argv):
    path = argv[1]
    args = argv[2:]
    y0, y1 = 170, 250
    if "--y" in args:
        i = args.index("--y")
        y0, y1 = int(args[i + 1]), int(args[i + 2])
        args = args[:i] + args[i + 3:]
    xs = [int(a) for a in args] or [185, 205, 225]
    width, height, rows = read_png(path)
    for x in xs:
        col = [luminance(rows[y][x]) for y in range(y0, min(y1, height))]
        steps = [(abs(col[i + 4] - col[i]), y0 + i) for i in range(len(col) - 4)]
        step, at = max(steps)
        print(f"x={x}: largest 4px step {step:.1f} at y={at}")


if __name__ == "__main__":
    main(sys.argv)
