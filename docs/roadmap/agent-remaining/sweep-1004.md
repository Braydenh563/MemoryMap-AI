# Sweep 1004: found, not fixed

Bug, security and CodeQL-hygiene sweep over the last ~60 commits (KG3 to KG9,
agent harness, mentions, notifications, preferences). Fixed in this sweep:
entity mentions kept after a note goes private, a quadratic log-scrub regex,
RecursionError from a runaway bracket in a tool argument, unbounded inbox
signal names and topic-summary terms.

Reviewed clean: router-level unlock on every new route; property writer (no
fence injection); relation-type and note-type routes; migrations (upgrade,
downgrade and re-upgrade on a fresh database, constraints and FKs kept);
mentions link action (offsets re-checked server side); `status.js` dismissal
(no innerHTML); every module-level regex timed against 40 adversarial shapes
(one finding, fixed); ruff with extra rules (E722, SIM115, S608, B023): the
S608 hits are constant placeholders.

## Not fixed

1. **FIXED (`LinkProps`, tests/test_private_link_props.py): link properties are not sealed on a link with a private end.** A link's
   `reason` is encrypted (`manager._seal_reason`) but `entry_links.props`
   (up to 20 values of 200 characters) is stored in the clear. Props are
   short and free text a person wrote about the two notes, so the same rule
   applies; sealing needs an encrypted JSON column or a string envelope plus a
   reader. Decision for the owner: seal (a `LinkProps` type like `LinkReason`)
   or state that props are metadata, like the link and its kind.
2. **An entity that only private notes ever named is still fetchable by id.**
   `GET /entities/{id}` returns its name and aliases with zero notes (the list
   hides it). The name was lifted from a note when it was readable. Cheapest
   fix: 404 an entity with no visible mention, as the list does.
3. **Other model-JSON readers catch only ValueError.** `extractor.py:135`,
   `janitor.py:638`, `passive_capture.py:146`, `reminder_parser.py:165` parse
   the span between a reply's first `{` and last `}`; a reply of several
   thousand nested braces raises RecursionError there. They run in background
   passes with their own outer guards (not checked each); the tool path, which
   had none, is fixed.
4. **`_coerce` accepts `nan` and `inf` for a `number` parameter**
   (`float("nan")`). No current tool has a `number` parameter whose handler
   would misbehave; noted for the next one.
5. **A dismissed reminder notification never returns** (`status.js`
   `notificationsDismissed`, keyed `reminder:<id>`): a reminder snoozed and
   overdue again stays hidden from the bell. By design of INBOX 508; revisit if
   the owner snoozes reminders.
6. **Not verified in a browser:** nothing here changed the UI; the notification
   dismissal was read, not run.
