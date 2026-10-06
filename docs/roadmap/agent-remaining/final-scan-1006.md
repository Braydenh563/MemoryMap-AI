# final-scan-1006: the 0.4.0 release candidate's last scan (INBOX 645)

Scope: `git diff origin/main...HEAD` (PR 162). Security, CodeQL shapes, the
four review shapes on this release's largest features, CI on a tag.
Already fixed and not redone: SEC-01 to SEC-17 (HISTORY, "Security audit
fixes, 2026-10-05" and its second pass).

## Landed

## Open (found, not fixed)

## Not verified

## Log
- done: 94f1747 (import ReDoS), df31d86 (agent _ADDRESS ReDoS), e6f5f41 (empty-except comments), 92dfd7f (int(inf) theme), 04a69b8 (release notes awk + 125k cap)
- next: review shapes on lazy moves, motion switch, history list; gate --changed; write findings
