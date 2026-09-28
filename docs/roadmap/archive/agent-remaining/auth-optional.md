# Agent: optional sign-in, INBOX 426 (aa)

Worktree `.claude/worktrees/agent-a7c1c32f8a1a35a10`, merged with
`origin/fix/gemini-fixes-5` at `3f22b52`. Port 8795, data dir
`/tmp/mm-auth-8795` (`bash scratchpad/ui-sweeps/serve.sh 8795 /tmp/mm-auth-8795`).

## Done

- `77222a7` the server: `ask_password_on_open` (preferences.json, not on
  `PreferencesBody`, so `PUT /preferences` cannot turn it off);
  `POST /auth/password-on-open` (off needs the current password, on the
  unlock throttle; audited both ways); `POST /auth/auto-session` (loopback
  `request.client.host`, no forwarding header, loopback Host; keeps a live
  token; audited); `POST /auth/unlock-vault` (same throttle, keeps the
  token); `/auth/status` says `auto_session` for this caller;
  `/auth/account` says `password_on_open`; Lock with sign-in off always
  drops the key; change-password and key rotation open a locked vault with
  the password they already check. 30 tests in
  `tests/test_optional_sign_in.py`, one more in
  `test_every_route_is_locked.py` (sign-in off opens no route by itself,
  loopback and LAN).
- `6f225d2` the app: the switch in Settings, Account and security; the boot
  path skips the lock screen when offered; an expired session comes back
  unless Lock was pressed here or in another tab; `askPasswordPrompt` (the
  lock card in `data-mode="prompt"`, Not now, Escape, z-index 1045 over
  Settings); "unlock to read" chip on a private note while the vault is
  locked; privacy toggles ask first; documents.js's lock watcher skips a
  prompt.
- Docs commit: DESIGN.md recipe row for the prompt and its ratchet
  (`test_no_second_password_form`), CHANGELOG line, this file.

Measured in Chromium against :8795: switch on by default; the turn-off
prompt is the topmost element over Settings (z 1045), a wrong password
shows "That isn't your current password", the right one unchecks the
switch with Settings still open; a fresh profile boots with the overlay
hidden and both media cookies set; the private note shows "unlock to read",
the chip opens "Unlock private notes", Escape closes it, a wrong password
shows "Wrong password", the right one shows the decrypted text; Lock shows
the lock screen, a reload starts a new session with the vault locked. curl
with `Host: evil.example` or `X-Forwarded-For` gets 403. Shots:
`scratchpad/shots/auth-optional-*.png` in the main checkout.

## Remaining

1. INBOX 426 (aa) is still in INBOX: the orchestrator marks and moves it at
   merge.
2. Not driven: the desktop window (pywebview). It loads
   `http://127.0.0.1:<port>` (`__main__.py`), so the Host check passes, but
   the persistent webview profile was not exercised.
3. Not driven: a real second device in LAN mode. The server binds
   127.0.0.1 here; the refusal is held by TestClient with client addresses
   192.168.1.50, 10.0.0.2, 8.8.8.8 and `testclient`.
4. Not looked at in dark: the prompt card (it is the lock card's own
   styling, unchanged).
5. The switch is offered in Settings only, not on the setup screen (the
   decision allowed either); the setup note now says it can be turned off
   in Settings.
6. "Lock everywhere" still confirms with "You'll need your password to get
   back in", which is not true on this computer with sign-in off. One line
   of copy in the `account-lock-all` handler (app.js), left because another
   agent is editing settings UI.
7. `scratchpad/ui-sweeps/lib.js` `boot()` waits for `#lock-password`; a
   sweep data dir with sign-in off would time out there. Only matters if a
   sweep turns the switch off; it could fall through when `#lock-overlay`
   stays hidden.
8. The vault key is process-wide (`core/vault.py`), as before: if a LAN
   device unlocks with the password, a loopback session without one reads
   private notes too until a lock or restart. Pre-existing architecture,
   not widened by this change; per-session keys would be a design change.
9. A local tunnel that adds no forwarding header at all and rewrites Host
   to a loopback name would be treated as this computer. ngrok and
   cloudflared both add `X-Forwarded-For`, which is refused; the risk is
   named in `_from_this_computer`'s docstring.
10. A restored backup that carries `preferences.json` could bring the
    setting back as it was when the backup was made; not checked whether
    restore touches preferences.
