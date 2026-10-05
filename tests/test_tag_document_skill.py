"""A synthesised export: every note under one tag, written up as a document
(BACKLOG section 26 "A synthesised export, not just a raw one", section 102
item 10). The raw exports hand over the notes as they are; this is the
built-in skill that reads them and writes one document, so it needs no new
endpoint, only a skill whose steps and toolbox are right.
"""

from __future__ import annotations

from memorymap.ai import skills, tools

NAME = "Write a document from a tag"


def _skill():
    return next(s for s in skills.BUILTIN_SKILLS if s["name"] == NAME)


def test_the_skill_takes_a_tag_and_names_it_in_its_prompt_and_steps():
    skill = _skill()
    assert [i["name"] for i in skill["inputs"]] == ["tag"]
    assert skill["inputs"][0].get("required") is True
    assert "{{tag}}" in skill["prompt"]
    assert any("{{tag}}" in step["text"] for step in skill["steps"])


def test_it_reads_before_it_writes_and_ends_on_create_document():
    steps = _skill()["steps"]
    contracts = [(s["expects"], tuple(s["tools"])) for s in steps]
    assert contracts[0] == ("tool_called", ("list_notes",))
    assert ("tool_called", ("get_note",)) in contracts
    assert contracts[-1] == ("tool_called", ("create_document",))
    # Every step names at most one tool (small-model mode offers only those).
    assert all(len(s["tools"]) <= 1 for s in steps)


def test_its_toolbox_is_the_reading_tools_and_the_one_write_it_needs():
    skill = _skill()
    assert "create_document" in skill["tools"]
    assert set(skill["tools"]) <= set(tools.TOOLS)
    # It writes a document, never a note: nothing here may edit or delete one.
    assert not {"update_note", "delete_note", "create_note"} & set(skill["tools"])
