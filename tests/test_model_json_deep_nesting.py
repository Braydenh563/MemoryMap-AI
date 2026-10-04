"""A model reply of thousands of nested brackets fails that pass quietly.

`json.loads` raises RecursionError past a few thousand levels on Python 3.11,
which is not a ValueError, so the readers of a model's JSON that caught only
ValueError let it escape into the background pass (sweep 1004, found-not-fixed
3). Newer Pythons parse the same text without raising, so these tests do not
assume which one happens: each reader is run with `json.loads` forced to raise
RecursionError (the 3.11 behaviour, on any version), and with a genuinely deep
reply, where the only claim is that nothing but the reader's own failure value
comes out.
"""

from __future__ import annotations

import json

import pytest

from memorymap.ai import extractor, janitor, passive_capture, reminder_parser

DEEP_OBJECT = "Sure! " + '{"a":' * 50000 + "1" + "}" * 50000
DEEP_ARRAY = "Sure! " + "[" * 50000 + "]" * 50000
SMALL_OBJECT = 'Sure! {"a": 1}'
SMALL_ARRAY = 'Sure! ["one two three"]'


@pytest.fixture
def too_deep(monkeypatch):
    def boom(*args, **kwargs):
        raise RecursionError("maximum recursion depth exceeded")

    monkeypatch.setattr(json, "loads", boom)


def test_the_extractor_reads_a_too_deep_reply_as_unusable(too_deep):
    with pytest.raises(ValueError):
        extractor._extract_json_object(SMALL_OBJECT)


def test_the_janitor_reads_a_too_deep_reply_as_unusable(too_deep):
    with pytest.raises(ValueError):
        janitor._extract_json(SMALL_OBJECT)


def test_passive_capture_finds_no_facts_in_a_too_deep_reply(too_deep):
    assert passive_capture._parse_facts(SMALL_ARRAY) == []


def test_the_reminder_parser_finds_no_object_in_a_too_deep_reply(too_deep):
    assert reminder_parser._extract_json(SMALL_OBJECT) is None


def test_a_really_deep_reply_never_escapes_as_a_recursion_error():
    # Whether this version raises or parses it, no RecursionError gets out.
    for reader in (extractor._extract_json_object, janitor._extract_json):
        try:
            reader(DEEP_OBJECT)
        except ValueError:
            # A refusal is a correct answer too; only RecursionError is not.
            continue
    passive_capture._parse_facts(DEEP_ARRAY)
    reminder_parser._extract_json(DEEP_OBJECT)
