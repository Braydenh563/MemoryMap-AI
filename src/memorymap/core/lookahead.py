"""A cached "where is the next one" for scanners that must stay linear.

A pattern such as `\\[([^\\]]*)\\]\\(` is quadratic on `[[[[[...` with no `]`:
every `[` start scans to the end of the text to learn there is no closer.
The scanners that replace those patterns ask this class for the first
occurrence of a delimiter at or after a position instead. The answer is
remembered: while later queries stay at or before the remembered hit, nothing
new can lie between them, so the text is searched once per stretch rather
than once per start (CodeQL's `py/polynomial-redos`, the final scan of
2026-10-06).
"""

from __future__ import annotations

import re


class Ahead:
    """`first(i)`: the index of the first match of `pattern` at or after `i`,
    or `len(text)` when there is none."""

    __slots__ = ("_text", "_rx", "_from", "_hit")

    def __init__(self, text: str, pattern: str):
        self._text = text
        self._rx = re.compile(pattern)
        self._from = 0
        self._hit = -1  # -1: nothing searched yet

    def first(self, start: int) -> int:
        if self._hit >= 0 and self._from <= start <= self._hit:
            return self._hit
        match = self._rx.search(self._text, start)
        self._from = start
        self._hit = match.start() if match else len(self._text)
        return self._hit
