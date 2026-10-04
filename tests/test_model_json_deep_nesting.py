"""A model reply of thousands of nested brackets fails that pass quietly.

`json.loads` raises RecursionError past a few thousand levels, which is not a
ValueError, so the readers of a model's JSON that caught only ValueError let it
escape into the background pass (sweep 1004, found-not-fixed 3).
"""

from __future__ import annotations

import pytest

from memorymap.ai import extractor, janitor, passive_capture, reminder_parser

DEEP_OBJECT = "Sure! " + '{"a":' * 50000 + "1" + "}" * 50000
DEEP_ARRAY = "Sure! " + "[" * 50000 + "]" * 50000


def test_the_extractor_reads_a_deep_reply_as_unusable():
    with pytest.raises(ValueError):
        extractor._extract_json_object(DEEP_OBJECT)


def test_the_janitor_reads_a_deep_reply_as_unusable():
    with pytest.raises(ValueError):
        janitor._extract_json(DEEP_OBJECT)


def test_passive_capture_finds_no_facts_in_a_deep_reply():
    assert passive_capture._parse_facts(DEEP_ARRAY) == []


def test_the_reminder_parser_finds_no_object_in_a_deep_reply():
    assert reminder_parser._extract_json(DEEP_OBJECT) is None
