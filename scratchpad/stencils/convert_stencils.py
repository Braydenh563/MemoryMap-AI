#!/usr/bin/env python3
"""Convert draw.io stencil libraries into the board's shape-set JSON.

Licence: the stencil libraries this reads are part of jgraph/drawio
(https://github.com/jgraph/drawio), Apache License 2.0, Copyright JGraph
Ltd. The converted JSON is a derivative work and carries that licence and the
notice in `frontend/board-library/drawio/NOTICE.txt`. This script is
MemoryMap's own (AGPL-3.0). jgraph also asks that the stencil libraries are
not incorporated into Atlassian products or the Atlassian marketplace
(src/main/webapp/stencils/LICENSE upstream); MemoryMap is neither.

Why two input forms: upstream no longer ships `stencils/*.xml`. Every library
lives in `src/main/webapp/js/stencils.min.js` as a base64 deflate of a small
delta-coded op stream (`mxStencilRegistry.loadStencil`, decoded by `decode`
there). `--min-js` reads that file and decodes it here, the same algorithm,
so the converter works on a bare clone; `--xml` reads a plain stencil XML.

What a stencil is (mxgraph/src/shape/mxStencil.js, drawNode): a `<shape>` of
`w` x `h` units with `<connections>` (constraints: x, y as 0..1 fractions,
`perimeter`, name), a `<background>` and a `<foreground>`. Both are streams of
drawing ops over one canvas state. `<path>` (move, line, quad, curve, arc,
close), `rect`, `roundrect` and `ellipse` replace the current geometry;
`fillstroke`, `fill` and `stroke` paint it with the current state, which
`fillcolor`, `strokecolor`, `strokewidth`, `alpha`, `fillalpha`,
`strokealpha`, `dashed`, `dashpattern`, `save` and `restore` change. That is
why a converted shape is a list of painted paths, not one outline.

Board shape JSON (the schema WHITEBOARD_PLAN "Decisions, 2026-10-10" fixes):
the existing `memorymap-library-set` entry (`payload.items` of `sketch`
rows with `data.d` and `shape: "custom"`, so the library loads it unchanged)
plus one extra field, `stencil`, that the panel ignores today and the format
panel and connection ports read later. Paths use only M, L, C and Z because
`wbPathBBox` and `wbPathPolyline` in whiteboard.js treat Q and S as unknown
and take an arc's box as a half ellipse; arcs and quads become cubics here.

Usage:
  convert_stencils.py --min-js stencils.min.js --library basic.xml --out DIR [--dump-xml DIR]
  convert_stencils.py --xml basic.xml --out DIR [--set-key drawio-basic]
Prints one JSON summary line per library (converted, skipped by reason,
dropped properties) and writes DIR/<library>.json.
"""
from __future__ import annotations

import argparse
import base64
import bisect
import json
import math
import re
import sys
import zlib
from collections import Counter
from pathlib import Path

try:  # untrusted XML: defusedxml when installed, stdlib otherwise
    from defusedxml import ElementTree as ET
except ImportError:  # pragma: no cover - environment dependent
    import xml.etree.ElementTree as ET

KAPPA = 0.5522847498307936  # cubic circle constant
DEFAULT_FILL_OPACITY = 0.12  # the existing flowchart set's body fill
BOARD_STROKE = 2  # the board's default width; draw.io's "inherit" maps here
PRIMITIVES = {"move", "line", "quad", "curve", "arc", "close"}

# --- the min.js container --------------------------------------------------

_DRAW = {"move", "line", "quad", "curve", "arc", "rect", "roundrect", "ellipse", "text", "image", "include-shape"}
_XS = {"x", "x1", "x2", "x3"}
_YS = {"y", "y1", "y2", "y3"}


def _fmt(n: int) -> str:
    return str(n // 1000) if n % 1000 == 0 else repr(n / 1000)


class _Node:
    __slots__ = ("name", "parent", "kids", "attrs")

    def __init__(self, name, parent):
        self.name, self.parent, self.kids, self.attrs = name, parent, [], []


def decode_min_js_entry(b64: str) -> _Node:
    """Port of `decode` in stencils.min.js (same stream layout and deltas)."""
    data = zlib.decompress(base64.b64decode(b64), -15)
    streams, off = [], 20
    for i in range(5):
        n = int.from_bytes(data[4 * i : 4 * i + 4], "big")
        streams.append(data[off : off + n])
        off += n
    ops, strs = streams[0], streams[4].decode("utf8").split("\0")
    pos, si = [0, 0, 0, 0], 0
    names: list[str] = []
    attr_names: list[str] = []
    root = _Node(None, None)
    parent = root
    px = py = 0
    deltas: dict[str, int] = {}

    def read(k: int) -> int:
        b, n, m = streams[k], 0, 1
        while True:
            c = b[pos[k]]
            pos[k] += 1
            n += (c & 127) * m
            m *= 128
            if not c & 128:
                break
        return -(n + 1) // 2 if n % 2 == 1 else n // 2

    while pos[0] < len(ops):
        op = ops[pos[0]]
        pos[0] += 1
        if op == 255:
            parent = parent.parent
            continue
        if (op >> 1) == len(names):
            names.append(strs[si])
            si += 1
        name = names[op >> 1]
        node = _Node(name, parent)
        parent.kids.append(node)
        count = ops[pos[0]]
        pos[0] += 1
        coords = name in _DRAW
        if name == "shape":
            px = py = 0
            deltas = {}
        for _ in range(count):
            aid = ops[pos[0]]
            pos[0] += 1
            if aid == len(attr_names):
                attr_names.append(strs[si])
                si += 1
            attr = attr_names[aid]
            kind = ops[pos[0]]
            pos[0] += 1
            if kind == 0:
                node.attrs.append((attr, strs[si]))
                si += 1
            elif coords and attr in _XS:
                px += read(1)
                node.attrs.append((attr, _fmt(px)))
            elif coords and attr in _YS:
                py += read(2)
                node.attrs.append((attr, _fmt(py)))
            else:
                key = f"{name} {attr}"
                deltas[key] = deltas.get(key, 0) + read(3)
                node.attrs.append((attr, _fmt(deltas[key])))
        if not op & 1:
            parent = node
    return root.kids[0]


def _to_xml(node: _Node) -> str:
    from xml.sax.saxutils import quoteattr

    attrs = "".join(f" {k}={quoteattr(v)}" for k, v in node.attrs)
    if not node.kids:
        return f"<{node.name}{attrs}/>"
    return f"<{node.name}{attrs}>" + "".join(_to_xml(k) for k in node.kids) + f"</{node.name}>"


def read_min_js(path: Path) -> dict[str, str]:
    """Every library in stencils.min.js as `{file name: base64 blob}`; one
    is decoded to XML by `min_js_xml` when asked for (all 200 take 15 s)."""
    with open(path, encoding="utf8") as handle:
        text = handle.read()
    return dict(re.findall(r"f\['([^']+)'\] = '([^']*)'", text))


def min_js_xml(blob: str) -> str:
    return _to_xml(decode_min_js_entry(blob))


# --- geometry --------------------------------------------------------------


def _num(v: float) -> str:
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def arc_to_cubics(x0, y0, rx, ry, rot_deg, large, sweep, x, y):
    """SVG arc (implementation notes F.6.5) as a list of cubic segments
    `(c1x, c1y, c2x, c2y, x, y)`, each covering at most a quarter turn."""
    if (x0, y0) == (x, y):
        return []
    rx, ry = abs(rx), abs(ry)
    if rx == 0 or ry == 0:
        return [(x0, y0, x, y, x, y)]
    phi = math.radians(rot_deg)
    cp, sp = math.cos(phi), math.sin(phi)
    dx, dy = (x0 - x) / 2, (y0 - y) / 2
    x1p, y1p = cp * dx + sp * dy, -sp * dx + cp * dy
    lam = (x1p**2) / (rx**2) + (y1p**2) / (ry**2)
    if lam > 1:
        s = math.sqrt(lam)
        rx, ry = rx * s, ry * s
    num = rx**2 * ry**2 - rx**2 * y1p**2 - ry**2 * x1p**2
    den = rx**2 * y1p**2 + ry**2 * x1p**2
    coef = math.sqrt(max(0.0, num / den)) if den else 0.0
    if bool(large) == bool(sweep):
        coef = -coef
    cxp, cyp = coef * rx * y1p / ry, -coef * ry * x1p / rx
    cx = cp * cxp - sp * cyp + (x0 + x) / 2
    cy = sp * cxp + cp * cyp + (y0 + y) / 2

    def ang(ux, uy, vx, vy):
        a = math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)
        return a

    t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry)
    dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry)
    if not sweep and dt > 0:
        dt -= 2 * math.pi
    elif sweep and dt < 0:
        dt += 2 * math.pi
    n = max(1, math.ceil(abs(dt) / (math.pi / 2) - 1e-9))
    step = dt / n
    k = 4 / 3 * math.tan(step / 4)
    out = []
    a = t1
    for _ in range(n):
        b = a + step
        ca, sa, cb, sb = math.cos(a), math.sin(a), math.cos(b), math.sin(b)

        def pt(ex, ey):
            return (cx + cp * rx * ex - sp * ry * ey, cy + sp * rx * ex + cp * ry * ey)

        p1 = pt(ca - k * sa, sa + k * ca)
        p2 = pt(cb + k * sb, sb - k * cb)
        p3 = pt(cb, sb)
        out.append((p1[0], p1[1], p2[0], p2[1], p3[0], p3[1]))
        a = b
    # Land exactly on the stated end point, not a rounding of it.
    last = out[-1]
    out[-1] = (last[0], last[1], last[2], last[3], x, y)
    return out


def ellipse_d(x, y, w, h):
    rx, ry = w / 2, h / 2
    cx, cy = x + rx, y + ry
    kx, ky = rx * KAPPA, ry * KAPPA
    return (
        f"M {_num(cx)} {_num(y)} C {_num(cx + kx)} {_num(y)} {_num(x + w)} {_num(cy - ky)} {_num(x + w)} {_num(cy)} "
        f"C {_num(x + w)} {_num(cy + ky)} {_num(cx + kx)} {_num(y + h)} {_num(cx)} {_num(y + h)} "
        f"C {_num(cx - kx)} {_num(y + h)} {_num(x)} {_num(cy + ky)} {_num(x)} {_num(cy)} "
        f"C {_num(x)} {_num(cy - ky)} {_num(cx - kx)} {_num(y)} {_num(cx)} {_num(y)} Z"
    )


def rect_d(x, y, w, h):
    return f"M {_num(x)} {_num(y)} L {_num(x + w)} {_num(y)} L {_num(x + w)} {_num(y + h)} L {_num(x)} {_num(y + h)} Z"


def roundrect_d(x, y, w, h, r):
    r = min(r, w / 2, h / 2)
    if r <= 0:
        return rect_d(x, y, w, h)
    k = r * (1 - KAPPA)
    x2, y2 = x + w, y + h
    return (
        f"M {_num(x + r)} {_num(y)} L {_num(x2 - r)} {_num(y)} C {_num(x2 - k)} {_num(y)} {_num(x2)} {_num(y + k)} {_num(x2)} {_num(y + r)} "
        f"L {_num(x2)} {_num(y2 - r)} C {_num(x2)} {_num(y2 - k)} {_num(x2 - k)} {_num(y2)} {_num(x2 - r)} {_num(y2)} "
        f"L {_num(x + r)} {_num(y2)} C {_num(x + k)} {_num(y2)} {_num(x)} {_num(y2 - k)} {_num(x)} {_num(y2 - r)} "
        f"L {_num(x)} {_num(y + r)} C {_num(x)} {_num(y + k)} {_num(x + k)} {_num(y)} {_num(x + r)} {_num(y)} Z"
    )


# --- colours and state -----------------------------------------------------

NAMED = {"white": "#ffffff", "red": "#ff0000", "green": "#008000", "blue": "#0000ff", "yellow": "#ffff00", "gray": "#808080", "grey": "#808080"}
HEX_RE = re.compile(r"^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")


class Dropped(Counter):
    """Properties the board has no counterpart for, counted not hidden."""


def resolve_colour(value, default, dropped: Dropped, what: str):
    """`value` as the board's colour: "ink", a 6-digit hex, None for none."""
    if value is None:
        return default
    v = value.strip()
    low = v.lower()
    if low == "none":
        return None
    if low in ("stroke", "fill", "font", "black", "currentcolor"):
        return "ink"
    if low in NAMED:
        return NAMED[low]
    if HEX_RE.match(v):
        h = v.lower()
        if len(h) == 4:
            h = "#" + "".join(c * 2 for c in h[1:])
        return "ink" if h == "#000000" else h
    # A style key (fillColor2, strokeColor2): the cell's style resolves it in
    # draw.io; here it falls back to the default and is counted.
    dropped[f"style-keyed {what} colour"] += 1
    return default


class State:
    def __init__(self):
        self.fill = "default"
        self.stroke = "default"
        self.width = None  # None = "inherit" (board default)
        self.alpha = 1.0
        self.fill_alpha = 1.0
        self.stroke_alpha = 1.0
        self.dashed = False
        self.pattern = None

    def clone(self):
        c = State()
        c.__dict__.update(self.__dict__)
        return c


# --- the interpreter -------------------------------------------------------


class Shape:
    def __init__(self, node, library: str):
        self.node = node
        self.library = library
        self.name = node.get("name") or "Unnamed"
        self.w = float(node.get("w") or 100)
        self.h = float(node.get("h") or 100)
        self.aspect = node.get("aspect") or "variable"
        self.strokewidth = node.get("strokewidth") or "1"
        self.items: list[dict] = []
        self.texts: list[dict] = []
        self.dropped = Dropped()
        self.segments = 0
        self.path_ops = 0

    def ports(self):
        out = []
        conns = self.node.find("connections")
        if conns is None:
            return out
        for c in conns:
            try:
                out.append(
                    {
                        "x": round(float(c.get("x")), 4),
                        "y": round(float(c.get("y")), 4),
                        "name": c.get("name") or "",
                        "perimeter": c.get("perimeter") == "1",
                    }
                )
            except (TypeError, ValueError):
                continue
        return out

    def run(self, by_name: dict, depth: int = 0, transform=None):
        """Interpret background then foreground. `transform` maps a point for
        an include-shape (x0, y0, sx, sy); None is the identity."""
        self.geom: str | None = None
        self.closed = False
        self._cur = (0.0, 0.0)
        self._start = (0.0, 0.0)
        self._parts: list[str] = []
        self._prev: dict | None = None
        state = State()
        stack: list[State] = []
        for section in ("background", "foreground"):
            sec = self.node.find(section)
            if sec is None:
                continue
            for child in sec:
                state = self._op(child, state, stack, by_name, depth, transform)
        return self

    # geometry ----------------------------------------------------------------
    def _p(self, x, y, t):
        # mxStencil reads a missing attribute as Number(null) = 0.
        x, y = float(x or 0), float(y or 0)
        if t:
            x0, y0, sx, sy = t
            return x0 + x * sx, y0 + y * sy
        return x, y

    def _path_ops(self, path, t):
        parts: list[str] = []
        cur = (0.0, 0.0)
        start = (0.0, 0.0)
        for op in path:
            tag = op.tag
            if tag == "move":
                cur = start = self._p(op.get("x"), op.get("y"), t)
                parts.append(f"M {_num(cur[0])} {_num(cur[1])}")
            elif tag == "line":
                cur = self._p(op.get("x"), op.get("y"), t)
                parts.append(f"L {_num(cur[0])} {_num(cur[1])}")
            elif tag == "quad":
                q = self._p(op.get("x1"), op.get("y1"), t)
                e = self._p(op.get("x2"), op.get("y2"), t)
                c1 = (cur[0] + 2 / 3 * (q[0] - cur[0]), cur[1] + 2 / 3 * (q[1] - cur[1]))
                c2 = (e[0] + 2 / 3 * (q[0] - e[0]), e[1] + 2 / 3 * (q[1] - e[1]))
                parts.append(f"C {_num(c1[0])} {_num(c1[1])} {_num(c2[0])} {_num(c2[1])} {_num(e[0])} {_num(e[1])}")
                cur = e
            elif tag == "curve":
                a = self._p(op.get("x1"), op.get("y1"), t)
                b = self._p(op.get("x2"), op.get("y2"), t)
                e = self._p(op.get("x3"), op.get("y3"), t)
                parts.append(f"C {_num(a[0])} {_num(a[1])} {_num(b[0])} {_num(b[1])} {_num(e[0])} {_num(e[1])}")
                cur = e
            elif tag == "arc":
                sx, sy = (t[2], t[3]) if t else (1.0, 1.0)
                e = self._p(op.get("x"), op.get("y"), t)
                segs = arc_to_cubics(
                    cur[0], cur[1], float(op.get("rx")) * sx, float(op.get("ry")) * sy,
                    float(op.get("x-axis-rotation") or 0), int(float(op.get("large-arc-flag") or 0)),
                    int(float(op.get("sweep-flag") or 0)), e[0], e[1],
                )
                if not segs:
                    continue
                for s in segs:
                    parts.append("C " + " ".join(_num(v) for v in s))
                cur = e
            elif tag == "close":
                parts.append("Z")
                cur = start
            else:
                self.dropped[f"path op {tag}"] += 1
        return " ".join(parts)

    def _colour_attr(self, node):
        """A stencil colour is a literal or the name of a cell style key
        (`accentColor`) with a `default` literal for when the style lacks it.
        The board has no per-cell style keys yet, so the default is the value;
        counted so the loss (a recolourable fill that is now fixed) shows."""
        color, default = node.get("color"), node.get("default")
        low = (color or "").strip().lower()
        literal = low in ("none", "stroke", "fill", "font", "black", "currentcolor") or low in NAMED or HEX_RE.match(color or "")
        if not literal and default:
            self.dropped["style-keyed colour (default used)"] += 1
            return default
        return color

    # ops ---------------------------------------------------------------------
    def _op(self, node, st: State, stack, by_name, depth, t):
        tag = node.tag
        if tag == "save":
            stack.append(st.clone())
            return st
        if tag == "restore":
            return stack.pop() if stack else st
        if tag == "path":
            self.geom = self._path_ops(node, t)
            self.path_ops += len(node)
        elif tag in ("rect", "roundrect", "ellipse"):
            x, y = self._p(node.get("x"), node.get("y"), t)
            sx, sy = (t[2], t[3]) if t else (1.0, 1.0)
            w, h = float(node.get("w") or 0) * sx, float(node.get("h") or 0) * sy
            if w <= 0 or h <= 0:
                # Upstream has a few bare `<rect/>` ops: a zero-area rectangle
                # that paints nothing; counted so the loss is visible.
                self.geom = None
                self.dropped["zero-area rect"] += 1
                return st
            if tag == "rect":
                self.geom = rect_d(x, y, w, h)
            elif tag == "ellipse":
                self.geom = ellipse_d(x, y, w, h)
            else:
                arc = float(node.get("arcsize") or 0) or 15.0  # RECTANGLE_ROUNDING_FACTOR * 100
                self.geom = roundrect_d(x, y, w, h, min(w * arc / 100, h * arc / 100))
            self.path_ops += 1
        elif tag in ("fillstroke", "fill", "stroke"):
            self._paint(tag, st)
        elif tag == "fillcolor":
            st.fill = self._colour_attr(node)
        elif tag == "strokecolor":
            st.stroke = self._colour_attr(node)
        elif tag == "strokewidth":
            try:
                st.width = float(node.get("width"))
            except (TypeError, ValueError):
                pass  # a missing or non-numeric width keeps the style's default
        elif tag == "alpha":
            st.alpha = float(node.get("alpha") or 1)
        elif tag == "fillalpha":
            st.fill_alpha = float(node.get("alpha") or 1)
        elif tag == "strokealpha":
            st.stroke_alpha = float(node.get("alpha") or 1)
        elif tag == "dashed":
            st.dashed = node.get("dashed") == "1"
        elif tag == "dashpattern":
            st.pattern = (node.get("pattern") or "").split()
        elif tag == "text":
            self.texts.append(
                {
                    "str": node.get("str") or "",
                    "x": round(float(node.get("x") or 0), 2),
                    "y": round(float(node.get("y") or 0), 2),
                    "align": node.get("align") or "left",
                    "valign": node.get("valign") or "top",
                }
            )
        elif tag == "include-shape":
            ref = by_name.get(node.get("name"))
            if ref is None or depth > 4:
                self.dropped["include-shape of another library"] += 1
            else:
                inner = Shape(ref, self.library)
                x, y = self._p(node.get("x"), node.get("y"), t)
                sx, sy = (t[2], t[3]) if t else (1.0, 1.0)
                w, h = float(node.get("w")) * sx, float(node.get("h")) * sy
                inner.run(by_name, depth + 1, (x, y, w / inner.w, h / inner.h))
                self.items.extend(inner.items)
                self.dropped.update(inner.dropped)
        elif tag == "image":
            self.dropped["image op"] += 1
        elif tag in ("linejoin", "linecap", "miterlimit", "fontstyle", "fontfamily", "fontsize", "fontcolor", "fillstrokecolor", "label"):
            self.dropped[f"{tag} (no board counterpart)"] += 1
        else:
            self.dropped[f"unknown op {tag}"] += 1
        return st

    def _paint(self, kind, st: State):
        if not self.geom or " " not in self.geom:
            return
        do_fill = kind in ("fillstroke", "fill")
        do_stroke = kind in ("fillstroke", "stroke")
        data: dict = {"d": self.geom, "shape": "custom", "color": "ink", "width": BOARD_STROKE}
        if do_stroke:
            colour = resolve_colour(st.stroke if st.stroke != "default" else None, "ink", self.dropped, "stroke")
            if colour is None:
                do_stroke = False
            else:
                data["color"] = colour
                if st.width is not None and abs(st.width - 1) > 1e-6:
                    data["width"] = max(1, min(8, round(BOARD_STROKE * st.width, 1)))
                if st.dashed:
                    pat = [p for p in (st.pattern or []) if p]
                    data["dash"] = "dotted" if pat and _leading_number(pat[0]) <= 1 else "dashed"
                if st.stroke_alpha < 1:
                    data["opacity"] = round(st.stroke_alpha, 2)
        if not do_stroke:
            data["noStroke"] = True
        if do_fill:
            explicit = st.fill != "default"
            colour = resolve_colour(st.fill if explicit else None, "ink", self.dropped, "fill")
            if colour is None:
                do_fill = False
            else:
                data["fill"] = colour
                # A default fill under an outline is the body tint the
                # flowchart set already uses; a bare fill, or an explicit
                # colour, is a detail meant to read solid.
                solid = kind == "fill" or explicit
                data["fillOpacity"] = round((1.0 if solid else DEFAULT_FILL_OPACITY) * st.fill_alpha, 2)
        if not do_fill and data.get("noStroke"):
            return
        if st.alpha < 1:
            data["alpha"] = round(st.alpha, 2)
        # `fill` then `stroke` of the same geometry is one row in the board.
        prev = self._prev
        if prev is not None and prev["d"] == data["d"]:
            if "fill" in prev and prev.get("noStroke") and do_stroke and not do_fill:
                prev.pop("noStroke")
                for k in ("color", "width", "dash", "opacity"):
                    if k in data:
                        prev[k] = data[k]
                return
            if "fill" not in prev and do_fill and not do_stroke:
                prev.update({k: data[k] for k in ("fill", "fillOpacity") if k in data})
                return
        self._prev = data
        self.items.append(data)
        self.segments += len(re.findall(r"[MLCZ]", data["d"]))


# --- library ---------------------------------------------------------------


def _leading_number(token: str) -> float:
    """A dash pattern's first length; a style key ("none", "dashPattern")
    reads as a long dash, which is what the board's `dashed` draws."""
    try:
        return float(token)
    except ValueError:
        return 99.0


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "shape"


def convert_library(xml_text: str, library: str, set_key: str | None = None):
    root = ET.fromstring(xml_text)
    shapes = root.findall("shape")
    by_name = {s.get("name"): s for s in shapes}
    lib_name = library.removesuffix(".xml")
    set_key = set_key or "drawio-" + slug(lib_name)
    items, skipped, dropped = [], [], Counter()
    seen: Counter = Counter()
    for node in shapes:
        sh = Shape(node, library).run(by_name)
        dropped.update(sh.dropped)
        reason = None
        if not sh.items:
            reason = "no painted geometry"
        elif sh.w <= 0 or sh.h <= 0:
            reason = "zero size"
        if reason:
            skipped.append({"name": sh.name, "reason": reason})
            continue
        key = slug(sh.name)
        seen[key] += 1
        if seen[key] > 1:
            key = f"{key}-{seen[key]}"
        rows = []
        for i, data in enumerate(sh.items):
            row = {"key": f"p{i}", "kind": "sketch", "data": data, "z": 5 + i}
            if len(sh.items) > 1:
                row["group"] = "g"
            rows.append(row)
        words = [w for w in re.split(r"[^a-z0-9]+", sh.name.lower()) if w]
        entry = {
            "key": key,
            "kind": "element",
            "name": sh.name,
            "tags": sorted({lib_name.replace("_", " "), *words}),
            "payload": {"box": {"w": sh.w, "h": sh.h}, "items": rows, "links": []},
            "stencil": {
                "source": f"jgraph/drawio stencils/{library}#{sh.name}",
                "aspect": sh.aspect,
                "strokewidth": sh.strokewidth,
                "ports": sh.ports(),
                "text": sh.texts,
                "segments": sh.segments,
            },
        }
        la = label_area(sh)
        if la:
            rows[0]["data"]["label_area"] = la
        rebased = rebase_ports(entry["stencil"]["ports"], sh.w, sh.h, rows[0]["data"]["d"])
        if rebased:
            rows[0]["data"]["ports"] = rebased
        items.append(entry)
    out = {
        "format": "memorymap-library-set",
        "version": 1,
        "key": set_key,
        "name": f"{root.get('name') or lib_name} (draw.io)",
        "source": {
            "project": "jgraph/drawio",
            "library": library,
            "licence": "Apache-2.0",
            "notice": "frontend/board-library/drawio/NOTICE.txt",
        },
        "items": items,
    }
    summary = {
        "library": library,
        "shapes": len(shapes),
        "converted": len(items),
        "skipped": dict(Counter(s["reason"] for s in skipped)),
        "skipped_names": [s["name"] for s in skipped][:12],
        "dropped": dict(dropped),
        "ports": sum(len(i["stencil"]["ports"]) for i in items),
        "segments": sum(i["stencil"]["segments"] for i in items),
    }
    return out, summary


def path_bbox(d: str):
    """Control-point hull of an M/L/C/Z path: what `wbPathBBox` in
    whiteboard.js measures, so a port stored as a fraction of it lands where
    the board will look for it."""
    nums = [float(v) for v in re.findall(r"-?\d+\.?\d*", d)]
    pts = list(zip(nums[0::2], nums[1::2]))
    if not pts:
        return None
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)


def rebase_ports(ports, w, h, first_d):
    """Stencil constraints are fractions of the shape's w x h. The board reads
    `data.ports` as fractions of the row's own box (`wbPortFractions`), and a
    converted shape's first row is not always the whole box, so the fractions
    are re-expressed against row 0. A port outside row 0 gets a value outside
    0..1, which is exact (the board multiplies back) and not clamped."""
    box = path_bbox(first_d)
    if not ports or not box:
        return []
    x0, y0, x1, y1 = box
    rw, rh = (x1 - x0) or 1.0, (y1 - y0) or 1.0
    out = []
    for p in ports:
        out.append({"x": round((p["x"] * w - x0) / rw, 4), "y": round((p["y"] * h - y0) / rh, 4), "name": p["name"]})
    return out


def label_area(sh: Shape):
    """Centred text rectangle (fractions of the box) for an outline that is
    clearly not a rectangle: a diamond, an ellipse. None means the whole box.
    Measured, not guessed: the outline's covered share of its box by sampling."""
    first = sh.items[0]["d"]
    cover = coverage(first, sh.w, sh.h)
    if cover is None or cover >= 0.9:
        return None
    side = max(0.4, min(1.0, math.sqrt(cover)))
    off = round((1 - side) / 2, 3)
    return {"x": off, "y": off, "w": round(side, 3), "h": round(side, 3)}


def flatten(d: str, steps: int = 12):
    """Closed polygons (lists of points) of an M/L/C/Z path."""
    toks = re.findall(r"[MLCZ]|-?\d+\.?\d*", d)
    polys, cur, i, pos = [], [], 0, (0.0, 0.0)
    while i < len(toks):
        t = toks[i]
        i += 1
        if t == "M":
            if cur:
                polys.append(cur)
            pos = (float(toks[i]), float(toks[i + 1]))
            i += 2
            cur = [pos]
        elif t == "L":
            pos = (float(toks[i]), float(toks[i + 1]))
            i += 2
            cur.append(pos)
        elif t == "C":
            c = [float(v) for v in toks[i : i + 6]]
            i += 6
            p0 = pos
            for s in range(1, steps + 1):
                u = s / steps
                a, b, cc, dd = (1 - u) ** 3, 3 * (1 - u) ** 2 * u, 3 * (1 - u) * u**2, u**3
                cur.append((a * p0[0] + b * c[0] + cc * c[2] + dd * c[4], a * p0[1] + b * c[1] + cc * c[3] + dd * c[5]))
            pos = (c[4], c[5])
        elif t == "Z":
            pass
    if cur:
        polys.append(cur)
    return polys


def coverage(d: str, w: float, h: float, grid: int = 40):
    """Share of the w x h box inside the outline (even-odd), or None."""
    polys = flatten(d)
    if not polys or w <= 0 or h <= 0:
        return None
    inside = 0
    for gy in range(grid):
        y = (gy + 0.5) / grid * h
        # Scanline: every edge crossing of this row once, then each sample
        # counts the crossings to its left (even-odd).
        xs = []
        for poly in polys:
            n = len(poly)
            for k in range(n):
                x1, y1 = poly[k]
                x2, y2 = poly[(k + 1) % n]
                if (y1 > y) != (y2 > y):
                    xs.append((x2 - x1) * (y - y1) / (y2 - y1) + x1)
        xs.sort()
        for gx in range(grid):
            x = (gx + 0.5) / grid * w
            inside += bisect.bisect_right(xs, x) % 2
    return inside / (grid * grid)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--min-js", type=Path, help="upstream js/stencils.min.js")
    src.add_argument("--xml", type=Path, help="a plain stencil XML file")
    ap.add_argument("--library", action="append", help="with --min-js: library file name, e.g. basic.xml (repeatable)")
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--set-key")
    ap.add_argument("--dump-xml", type=Path, help="also write each decoded library as plain XML here (the render check reads it)")
    args = ap.parse_args(argv)
    args.out.mkdir(parents=True, exist_ok=True)
    jobs: list[tuple[str, str]] = []
    if args.min_js:
        libs = read_min_js(args.min_js)
        for name in args.library or sorted(libs):
            if name not in libs:
                print(json.dumps({"library": name, "error": "not in stencils.min.js"}))
                continue
            jobs.append((name, min_js_xml(libs[name])))
    else:
        with open(args.xml, encoding="utf8") as handle:
            jobs.append((args.xml.name, handle.read()))
    for name, xml_text in jobs:
        if args.dump_xml:
            args.dump_xml.mkdir(parents=True, exist_ok=True)
            with open(args.dump_xml / name.replace("/", "__"), "w", encoding="utf8") as handle:
                handle.write(xml_text)
        data, summary = convert_library(xml_text, name, args.set_key if len(jobs) == 1 else None)
        target = args.out / (name.removesuffix(".xml").replace("/", "__") + ".json")
        with open(target, "w", encoding="utf8") as handle:
            json.dump(data, handle, separators=(",", ":"), ensure_ascii=False)
        summary["bytes"] = target.stat().st_size
        print(json.dumps(summary))
    return 0


if __name__ == "__main__":
    sys.exit(main())
