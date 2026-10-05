# Audit 2026-10-05: the shared brief

The owner asked for a deep, critical audit of the whole app: architecture,
backend, frontend code and design, security, UX, and how complete each
feature really is. The goal is to find the issues every session so far has
missed. Five Opus agents each audit one area and write one report here.

## Rules for every audit agent

- **Read-only on the code.** Write only your own report,
  `scratchpad/audit1005/<area>.md`. Run no git commands that change state.
- **Existing work first.** Read CLAUDE.md, docs/ROADMAP.md (opening table),
  and the plan files for your area. A finding that a plan already lists is
  marked `KNOWN (plan, section)`, and you say whether the plan's "built" claim
  holds in the code and app as they are now. Your value is the NEW and the
  WRONGLY-CLOSED.
- **Measure, do not guess.**
  - Evidence is a file:line, a command and its output, or a browser
    measurement (getComputedStyle, getBoundingClientRect, timings).
  - Run the app: `bash scratchpad/ui-sweeps/serve.sh <your port> /tmp/mm-audit-<area>`,
    password `testpassword123`, Playwright via `scratchpad/ui-sweeps/lib.js`
    (see CLAUDE.md section 5 traps).
  - Never pkill -f; stop a server with `bash scratchpad/killport.sh <port>`.
- **Never run the full test suite.** Targeted tests only, with a private
  `--basetemp`.
- **Each finding:**
  - id (e.g. SEC-07);
  - title;
  - evidence;
  - impact;
  - severity (Critical / High / Medium / Low);
  - KNOWN or NEW;
  - fix (concrete: files, approach, effort S/M/L).
- **Report shape:**
  1. Summary: the five worst things, one line each.
  2. Findings, by severity.
  3. "Claimed built but not": a plan says built and it is not.
  4. Top 5 execution briefs, each pasteable to an agent: goal, files, steps, acceptance tests, risks.
  5. What you could not verify.
- **Concise:** bullets, no preamble. No em-dashes (a lint fails the build on
  them in docs).
- Commit nothing. Final message to the orchestrator: five lines (status, report
  path, counts by severity, top 3, not verified).
