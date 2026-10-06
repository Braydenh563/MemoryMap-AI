# forgotpw-1006: a robust, secure "Forgot your password?" (INBOX 663)

Worktree `agent-a39c1dbd068f6626d`, merged from `claude/mini-release-0.4.1` c4e49f9.
The owner: "it needs to be robust and secure."

## Landed

- e575d00 backend: `crypto.new_recovery_key` / `normalise_recovery_key`;
  `vault.issue_recovery`, `open_with_recovery`, `rewrap_with`; Vault
  `recovery_salt`, `recovery_wrapped_dek`, `recovery_created_at` (migration
  d7a3f1c9e2b5, guarded both ways); `POST /auth/recovery-key` (password,
  throttled), `/auth/recover` and `/auth/reset` (this computer only, open, in
  `test_every_route_is_locked.OPEN` with the reason); `/auth/status` adds
  `reset_here` and nothing else; `core/password_reset.reset_password` shared
  by the CLI and the route; a re-key hands out a new recovery key.
- 0f1d0f0 frontend: the lock card's link, `#lock-forgot-card` (two paths),
  `#recovery-key-dialog` (offer after setup, show once, cleared on close),
  Settings "Recovery key" group; account-recovery.js + recovery-lazy.css lazy;
  help moved (popovers, Settings, the Guide's `security` and `lock` topics,
  PRIVACY, TROUBLESHOOTING, INSTALL, ARCHITECTURE, README, DESIGN recipe rows).
- dd452b2 `scratchpad/ui-sweeps/forgotpw.js`; 44px floor on the card's
  controls and the lock card's Unlock; re-encrypt no longer fails for good after
  a reset (sealed notes left as they are, `notes_sealed`).
- this commit: the sweep's Settings pass (Replace it) and its 401 list; INBOX
  663 moved to HISTORY.

## Decisions taken here (none reopened)

- Minimal open answer: `/auth/status` says only `reset_here` (about the caller).
  A missing and a wrong recovery key are the same 401; a malformed key or a
  short new password is a 400 that names nothing about the notebook and is not
  counted as a guess (checked before the key is tried).
- The step after setup reuses the password just typed (held in the call, dropped
  on close) rather than asking again; Settings asks it on the lock prompt.
- After a recovery reset the caller is signed in with a new token (like
  change-password); every other session and grant ends.
- Re-encrypt replaces the recovery key when one existed (the old key wraps the
  old DEK, which a re-key exists to retire).

## Left

- Not verified: Download .txt in the desktop window (pywebview routes it
  through `saveFile` to the exports folder, default `<data dir>/exports`, which
  is beside the notebook; the dialog says to keep the key away from this
  computer, but the saved copy is not deleted for the person). Next: decide
  whether the desktop path should open a native Save dialog instead
  (`src/memorymap/__main__.py` webview API) or warn in the toast.
- Not verified in a browser: the another-device notice on the card (the sweep
  server binds loopback only); held by `test_both_open_routes_refuse_another_device`.
- Not verified: a real phone; screen-reader reading of the card.

## Found, not fixed

- `/jobs/last-runs` is polled after a lock and answers 401 once or twice per
  lock (forgotpw.js's refused list; pre-existing, not this feature). Next: stop
  the poll in `lockNow`/`purgeLockedContent` (grep `last-runs` in frontend/js).
- app.js is at 14,2xx of its 14,300-byte gzip ratchet
  (`tests/test_static_compression.py`): this feature had to move its link and
  card visibility into CSS to fit.
