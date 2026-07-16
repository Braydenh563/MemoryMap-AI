"""Phase 1: config + database behave as promised."""

from __future__ import annotations

import json

from sqlalchemy import select

from memorymap.core.config import ConfigManager
from memorymap.core.database import AuditLog, Category
from memorymap.entry import manager


def test_config_creates_data_dir_and_defaults(tmp_path):
    config = ConfigManager(data_dir=tmp_path / "data")
    assert config.data_dir.is_dir()
    assert config.get_preference("chat_model") == "llama3.2"
    assert config.get_preference("embedding_backend") == "sentence-transformers"
    assert config.get_preference("recycle_bin_days") == 30


def test_set_preference_persists_to_disk(tmp_path):
    config = ConfigManager(data_dir=tmp_path / "data")
    config.set_preference("chat_model", "qwen2.5:3b")

    # A brand-new instance (like an app restart) must see the change.
    reloaded = ConfigManager(data_dir=tmp_path / "data")
    assert reloaded.get_preference("chat_model") == "qwen2.5:3b"


def test_corrupt_preferences_file_falls_back_to_defaults(tmp_path):
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    (data_dir / "preferences.json").write_text("{not valid json")
    config = ConfigManager(data_dir=data_dir)
    assert config.get_preference("chat_model") == "llama3.2"


def test_create_and_list_entries(session):
    manager.create_entry(session, "remember the milk", tags=["shopping"])
    manager.create_entry(session, "a dad joke about cheese")

    entries = manager.list_entries(session)
    assert len(entries) == 2
    # Newest first.
    assert entries[0].content == "a dad joke about cheese"
    assert manager.entry_tags(entries[1]) == ["shopping"]
    assert manager.category_name_for(session, entries[0]) == "Uncategorised"


def test_uncategorised_category_created_once(session):
    manager.create_entry(session, "first")
    manager.create_entry(session, "second")
    names = session.scalars(select(Category.name)).all()
    assert names.count("Uncategorised") == 1


def test_entry_creation_is_audit_logged(session):
    entry = manager.create_entry(session, "log me")
    actions = session.scalars(
        select(AuditLog).where(
            AuditLog.entity_type == "entry", AuditLog.entity_id == entry.id
        )
    ).all()
    assert [a.action for a in actions] == ["created"]


def test_soft_deleted_entries_hidden_from_list(session):
    entry = manager.create_entry(session, "to be binned")
    entry.is_deleted = True
    session.commit()
    assert manager.list_entries(session) == []
    assert len(manager.list_entries(session, include_deleted=True)) == 1


def test_bad_tags_json_returns_empty_list(session):
    entry = manager.create_entry(session, "tags test")
    entry.tags = "not json"
    assert manager.entry_tags(entry) == []
    assert json.loads('["ok"]') == ["ok"]  # sanity: helper mirrors json rules
