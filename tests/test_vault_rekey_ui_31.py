"""WORLD_CLASS_PLAN row 31, item 261: the vault re-key has a button.

`POST /auth/rotate-vault-key` (a fresh key, every private note moved onto it)
existed with tests and no way to reach it. Settings, Account has it now, under
Change your password: the current password, a confirm that says what happens,
and the result in words.
"""

from __future__ import annotations

import re
from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[1] / "frontend"
INDEX = (FRONTEND / "index.html").read_text(encoding="utf-8")
CONTROLS = (FRONTEND / "js" / "settings-controls.js").read_text(encoding="utf-8")


def test_the_account_pane_has_the_control():
    account = INDEX.split('id="settings-account"', 1)[1].split('id="settings-privacy"', 1)[0]
    assert 'id="account-rekey-password"' in account and 'id="account-rekey"' in account
    assert 'id="account-rekey-status"' in account
    # Its help popover is in the markup too.
    assert 'data-help-for="rekey-help"' in account and 'id="rekey-help"' in account
    # One filled button per pane: the re-key is a ghost one.
    tag = re.search(r'<button id="account-rekey"[^>]*>', account).group(0)
    assert "ghost" in tag


def test_the_handler_confirms_then_posts_and_keeps_the_new_token():
    handler = CONTROLS.split('$("account-rekey").addEventListener("click"', 1)[1].split("\n});", 1)[0]
    assert "confirmDialog(" in handler
    assert handler.index("confirmDialog(") < handler.index("/auth/rotate-vault-key")
    assert "current_password" in handler and "ownsAuthErrors: true" in handler
    # The fresh token it hands back replaces this tab's, as Change password does.
    assert 'localStorage.setItem("token", result.token)' in handler
    assert "notes_reencrypted" in handler
