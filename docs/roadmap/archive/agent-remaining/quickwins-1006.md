# quickwins-1006: three fixes from final-scan-1006 (items 4 and 5, and the E2E retry)

Status: all three landed, one commit per fix (four for item 4, one per
scanner). Nothing below is open work on those items; what follows is what
the agent found and did not do.

## Landed

- E2E: the `first-run` project has `retries: 0` (its specs assert an empty
  notebook, so a retry always fails on the first attempt's note).
- ReDoS, item 4, each test written first: `entry/manager.py` `_md_links`
  (0.3 to 0.8 s on 20 KB, now under 0.01 s), `core/docexport.py`
  `inline_split` (0.6 to 1.9 s, now under 0.02 s), `ai/answer_trim.py`
  `_METADATA` (14 to 15 s on 20,000 spaces, now under 0.01 s). A shared
  `core/lookahead.py` `Ahead` (a cached "next delimiter") keeps the first two
  linear without changing what they match; `tests/test_quadratic_scans.py`
  holds each old pattern as an oracle over 400 to 4,000 random strings.
- `ai/questions.py` `_title` was never quadratic (anchored `re.match`;
  measured 0.005 s at 200 KB, ten times the input for ten times the time).
  Replaced with a bounded loop anyway so CodeQL stops reading it as one;
  there is no "failed before" number for it.
- Item 5: the document import and the job resume record a plain sentence in
  Background jobs; the exception stays in the log with its traceback.

## Not verified

- No browser: the Background jobs pane was not looked at, only the row text
  through `/jobs/last-runs` and the jobstore row.
- The Playwright config change was checked with `node --check` only; no E2E
  run (a CI-only setting).
- CodeQL's verdict on the rewrites arrives with the next push.

## Found, not fixed

- Other jobruns detail strings that carry `{exc}` (grep `note_finished` and
  `run.fail(` across `src/`) were not audited; only the two named in item 5
  were changed.
- `core/docexport.py` still has the old `_INLINE` pattern, kept as the
  documented reference for `inline_split`; nothing calls it.
- Other `[^\]\n]`-style scanners may share the shape (the markdown link
  stripping in the frontend is JS, not covered by this).
