# MemoryMap AI — read this first

A 100% offline, local-first notebook where a local AI files your notes and
answers questions about them. Python + FastAPI backend, vanilla JS frontend,
SQLite. No build step: `frontend/app.js` and `frontend/style.css` are served
as-is.

## Before you build anything

**Check the running app first.** Three separate sessions have independently
rebuilt something that already existed, and an audit of one roadmap section
found four of its six "quick wins" already done. Ten seconds of `grep` is
cheaper than a session of rework.

# EMPHASIS ON THESE INSTRUCTIONS
1. Check the running app before building. You said: {"Three sessions rebuilt existing work. It's the single most expensive recurring mistake in this project's history."}
2. You can't see a browser — say what you couldn't verify. You said: {"Everything visual I did this session is reasoned, not observed. A session that forgets this will report UI work as done when it's untested."}

## Where things are written down

| File | What it answers |
| --- | --- |
| [`docs/roadmap/HANDOVER.md`](docs/roadmap/HANDOVER.md) | **Read this first.** The last session's handover: what changed, what could not be verified and why, where to start, and the traps that cost an hour each. |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | The live list, plus §35 and §36 — the freshly reported work. |
| [`docs/roadmap/BACKLOG.md`](docs/roadmap/BACKLOG.md) | The standing backlog, §1–§29. |
| [`docs/roadmap/ANALYSIS.md`](docs/roadmap/ANALYSIS.md) | §30–§34, §59, §60. Judgements and competitor reads — **including the licence constraint. This project is AGPL-3.0 now, so odysseus's AGPL code may come in (with its notices); nothing may go out to an MIT project.** §59 is a second, unrelated read (claude-obsidian/cognee/graphify, all permissively licensed) behind ROADMAP.md items 32–36 (32/33/34 now built; 36 backend-only, see HANDOVER.md). §60 is a second odysseus read, behind ROADMAP.md items 37–39. |
| [`docs/roadmap/HISTORY.md`](docs/roadmap/HISTORY.md) | What is already built. Read it before starting anything. |
| [`docs/DESIGN.md`](docs/DESIGN.md) | The design system. Any CSS work has to follow it; `tests/test_style_scale.py` fails the build otherwise. |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | How the pieces fit. |

The roadmap was split because it passed 4,500 lines. **Section numbers did not
change**, so a `§21` in a code comment still resolves — but a session that
reads only `ROADMAP.md` will miss finished work and settled decisions. All four
files cross-link, and `tests/test_docs_layout.py` enforces that.

## The standing caveat

**Every provider test runs against a fake transport.** SSE framing and
tool-call fragment indices come from reading the spec, not from a running LM
Studio. Reasoning about behaviour instead of reproducing it has cost real time
more than once — when something is reported broken, reproduce it before
theorising, and say plainly when you could not.

**The UI half of that caveat is now lifted, and you should use it.** The
sandbox has Chromium and Playwright, and the app runs on localhost:

```bash
# setsid, not plain &. `pkill -f uvicorn` kills your own shell here (same
# process group, exit 144) — start it detached and leave it running.
setsid env PYTHONPATH=src MEMORYMAP_DATA_DIR=<scratch>/appdata \
    .venv/bin/python -m uvicorn memorymap.api.app:create_app \
    --factory --port 8781 > <scratch>/server.log 2>&1 < /dev/null &
# then drive it: node script.js, requiring
# /opt/node22/lib/node_modules/playwright, with PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
```

**Two Playwright traps, each worth an hour:** `waitUntil: "networkidle"` never
settles against this app — it polls reminders, model status and tasks, so
`goto` and `reload` both time out at 30s. Use `domcontentloaded` plus an
explicit `waitForTimeout`. And the login is *one* field in two modes, not a
setup/confirm pair: fill `#lock-password`, click `#lock-submit`.

Unlock with the password you set on first run, skip `#onboarding-overlay`, and
you can click, measure and screenshot. One sitting of this found three bugs
that reading the source had not: a static-file cache header that let the
desktop app run yesterday's `app.js` (which is why a fixed button gets
reported broken *again*), a reminder poll running on two timers, and a tab
clipped off the left edge. **Measure and look before you claim a UI change
works — and still say plainly what you did not check.**

A later sitting found the worst UI bug in the project's history the same way,
and it is the best argument for this rule: two settings were missing from
`APPEARANCE_DEFAULTS`, so `undefined` and `NaN` were written into two CSS
custom properties, and **every card, field and dialog in the app rendered flat
and borderless on every fresh profile.** Nothing logged, nothing threw, and the
source reads as correct at every single line involved. One `getComputedStyle`
found it. The shape to remember: *a value that is invalid where it is used, not
where it is set, does its damage nowhere near the code that caused it.*

## Reviewing work that came from somewhere else

A week of another agent's work was merged-in and audited (§40). It was not bad
work — the features were good ideas and several are now core — but it arrived
with 90 failing tests, and the failures had four recurring shapes. Look for
these first, in this order, because they are cheap to check and expensive to
miss:

1. **A working thing rewritten into a riskier thing**, with no stated reason.
   `/chat/stream` became a WebSocket: nothing gained, and it cost thread-safety,
   the auth gate and the same-origin policy.
2. **Features that never ran once.** Not buggy — never executed. A `start()`
   never called, a function that does not exist called inside a broad `except`,
   a method name that appears nowhere else in the codebase. Grep for the call
   site of anything new before believing it works.
3. **A guard removed while the shape around it was kept.** Two tools grew batch
   arguments and quietly stopped calling `_require_note`, which is the only
   thing that refuses a private note. The code still looked right.
4. **A policy silently refusing the work.** Thirty-five inline `style`
   attributes, all rejected by this app's own CSP, all invisible until a
   browser was pointed at them.

**Run the suite against the base branch first.** Knowing `main` had exactly two
failures — both a time-bomb in a dated test, not the other agent's doing — was
what made "everything else here is new" a fact rather than a guess.

## Working here

- **Do not install torch, and do not install `sentence-transformers` (which
  pulls it in).** It has failed to install in several sessions and costs a long
  time before it does. You said: {"When installing dependencies in prev
  sessions torch hasn't installed properly so skip it."} The suite passes
  without both — semantic search falls back to keywords, and the tests that
  care use a fake embedding backend. Install the rest by hand rather than
  `-r requirements.txt`:

  ```bash
  python3 -m venv .venv && .venv/bin/pip install fastapi "uvicorn[standard]" \
      SQLAlchemy python-dotenv requests numpy "fsspec[http]" bcrypt \
      cryptography python-multipart pytest httpx ruff
  ```

- `python -m pytest tests/` — ~1,600 tests, ~3 minutes, all green. Keep it that way.
- **Restart the server after any Python change.** A stale uvicorn is why a
  correct fix "didn't work" twice in one session — the browser was running the
  old code and the diff looked wrong.
- `.venv/bin/ruff check .` before pushing — **CI runs it and it fails the
  build.** CI also runs CodeQL, which has caught a real polynomial-ReDoS in
  code written the same session; an anchored `[…]+$` is the shape to avoid.
- Running the app needs `PYTHONPATH=src`, which the recipe below omits:
  `PYTHONPATH=src MEMORYMAP_DATA_DIR=<scratch> .venv/bin/python -m uvicorn memorymap.api.app:create_app --factory --port 8781`
- `node --check frontend/app.js` after any JS edit; there is no bundler to catch you.
- Several tests are **lints, not behaviour tests**, and exist because browsers
  and this Python suite cannot see the DOM: `test_style_scale.py` (design
  tokens), `test_frontend_ids.py` (duplicate ids), `test_frontend_handlers.py`
  (duplicate event listeners), `test_docs_layout.py` (the roadmap split). If
  one fails, it has found something real — fix the cause, don't widen the rule.
- Comments here explain **why**, at length, and match that. A comment that
  restates the code is noise; one that records the failure it prevents is why
  this codebase is maintainable by a fresh session.
- Prompt text is budgeted: `agent.PROSE_BUDGET_CHARS` is asserted, because
  every sentence added to the system prompt is resent on every round.

---

# Appendix: user-supplied token-budget policy (optional, removable)

The user pasted this policy verbatim and asked it be kept here as a clearly
separate block so it can be deleted on its own without touching anything
above. It targets the interactive Claude Code CLI (`/usage`, `/compact`,
`/model`, `/effort` as slash commands); this repo is also worked on through
Claude Code on the web / CCR sessions, where those aren't literal commands
you can shell out to — treat the mechanisms below as **intent**, mapped onto
whatever the running surface actually offers (e.g. `ScheduleWakeup` fallback
checks instead of a polled `/usage`, a real `/compact` where the CLI exposes
one), not as literal command invocations that must resolve on every surface.
The core rules — don't downgrade model/effort for quality-sensitive work
just because quota is low, keep subagents terse (final-summary-only, no
running commentary), compact proactively rather than hitting a hard limit —
apply regardless of surface.

# Claude Code Token Budget & Auto-Compaction Policy (v2)

## Overview

This policy instructs Claude Code to:
1. Periodically check session usage with `/usage`
2. Auto-compact context when it approaches 500k tokens
3. **Preserve model/effort quality** — do NOT downgrade based on quota alone
4. Adapt **only non-quality factors** when quota is low (subagents, images, verbosity for simple tasks)
5. Enforce token-efficiency rules on subagents
6. Suppress running commentary in subagents (final summary only)

---

## 1. Periodic Usage Checks

**Trigger:** Every 10–15 turns, or before starting large tasks.

**Action:**
```bash
/usage
```

**Parse the output** to extract:
- Current session token count
- Remaining quota (5-hour rolling window)
- Weekly cap remaining

**Log internally** (do not output to user unless asked):
- `session_tokens_used`
- `quota_remaining_pct`

---

## 2. Auto-Compaction Threshold

**Condition:** If `session_tokens_used >= 500000` OR `context_tokens >= 450000`

**Action:**
```bash
/compact
```

**Rationale:**
- Prevents cache invalidation from runaway context growth
- Keeps per-turn costs low (cache reads vs full rewrites)
- Avoids hitting hard session limits mid-task

**Exception:** Do NOT compact if:
- User explicitly requested full history retention
- Active debugging session where context is critical
- Within 5 turns of a previous `/compact` (avoid thrashing)

---

## 3. Quality-First Behavior Adaptation

### Core Principle
**Do NOT change model or effort level based solely on token quota.** Quality and correctness take priority over cost savings.

### Low Quota Adaptations (Quota <30%)

When quota is low, adapt **only these non-quality factors**:

| Factor | Normal Behavior | Low Quota Behavior |
|--------|----------------|--------------------|
| **Model selection** | Task-driven (Opus for complex, Sonnet for routine) | **Unchanged** — keep task-appropriate model |
| **Effort level** | Task-driven (high for complex, low for simple) | **Unchanged for complex tasks**; may use low effort for trivial tasks only |
| **Subagents** | Allowed if ROI justifies | **Disable** unless truly necessary |
| **Images** | Allowed with resolution limits | **Avoid** unless vision is essential |
| **Commentary verbosity** | Concise but complete | **More concise** for simple tasks; maintain full reasoning for complex tasks |
| **Proactive warnings** | None | Notify user at 30%, 15%, and 5% quota |

### Effort Adjustment Logic (Low Quota Only)

```
IF quota < 30%:
    IF task_complexity == "trivial" (e.g., file rename, simple search):
        SET effort = low
    ELSE IF task_complexity == "moderate" (e.g., refactor, bug fix):
        KEEP effort = medium (task-driven)
    ELSE IF task_complexity == "complex" (e.g., architecture, novel algorithm):
        KEEP effort = high (task-driven)
        DO NOT downgrade
```

**Rationale:** Downgrading effort on complex tasks increases error risk, which leads to rework and higher token costs overall.

---

## 4. Subagent Token Efficiency Rules

**When spawning subagents**, inject the following constraints:

### 4.1 Inherit Core Rules
Subagents must follow the same token-efficiency principles:
- Avoid cache-invalidating actions
- Minimize context size
- Use appropriate model/effort for task complexity

### 4.2 Commentary Suppression
**Default subagent behavior:**
- **NO running commentary** during execution
- **NO intermediate "thinking out loud"**
- **ONLY output:** Final summary with:
  - Task completed (Y/N)
  - Key results/artifacts produced
  - Errors encountered (if any)
  - Recommended next steps (if applicable)

**Example subagent output format:**
```
## Task: [brief description]

**Status:** ✅ Completed

**Results:**
- [artifact 1]
- [artifact 2]

**Errors:** None

**Next steps:** [optional recommendation]
```

### 4.3 Subagent Usage Budget
- Allocate **≤20% of remaining session quota** per subagent
- If subagent approaches its budget, terminate and summarize
- Report subagent token cost to parent agent for tracking

### 4.4 Low Quota Subagent Restrictions

```
IF quota < 30%:
    ALLOW subagents ONLY IF:
        - Task is clearly parallelizable
        - Estimated speedup > 2×·
        - No viable single-agent alternative
    OTHERWISE: disable subagents
```

---

## 5. Implementation Pseudocode

```python
# Pseudocode for Claude Code internal logic

def before_each_turn():
    turn_count += 1
    
    # Check usage every 10–15 turns
    if turn_count % 12 == 0:
        usage = run_command("/usage")
        session_tokens = parse_usage(usage)
        
        # Auto-compact if needed
        if session_tokens >= 500000:
            run_command("/compact")
            turn_count = 0  # reset counter
        
        # Adapt behavior based on quota (quality-first)
        quota_remaining = get_quota_remaining_pct()
        adapt_behavior(quota_remaining, current_task_complexity)

def adapt_behavior(quota_pct, task_complexity):
    # Model: NEVER change based on quota
    # Effort: task-driven, unchanged for complex tasks even at low quota
    
    if quota_pct < 30%:
        # Low quota adaptations (non-quality factors only)
        if task_complexity == "trivial":
            set_effort("low")  # safe to reduce verbosity
        # else: keep task-driven effort level
        
        # Restrict subagents
        if task_complexity != "complex_parallel":
            allow_subagents(False)
        
        # Avoid images
        allow_images("essential_only")
        
        # Warn user
        if quota_pct < 15%:
            warn_user(f"Token quota low ({quota_pct}%). Consider /clear or ending session.")
        if quota_pct < 5%:
            warn_user("Token quota critical. Strongly recommend ending session.")
    
    # Normal behavior (quota >= 30%)
    else:
        allow_subagents(True)
        allow_images(True)

def spawn_subagent(task, quota_pct):
    # Inject token efficiency rules
    subagent_rules = load_token_efficiency_rules()
    subagent_rules.commentary = "final_summary_only"
    
    # Budget allocation
    subagent_budget = remaining_quota * 0.20
    subagent_rules.budget = subagent_budget
    
    # Low quota restrictions
    if quota_pct < 30%:
        if not is_clearly_parallelizable(task):
            raise Exception("Subagents disabled at low quota for non-parallel tasks")
    
    return create_subagent(task, rules=subagent_rules)
```

---

## 6. User Notifications

**Notify user when:**
- Auto-compaction occurs: *"Context auto-compacted to reduce token usage."*
- Quota drops below 30%: *"Token usage at 70%+. Subagents and images restricted. Model/effort unchanged for quality."*
- Quota drops below 15%: *"Token quota low (~X%). Consider `/clear` or ending session soon."*
- Quota drops below 5%: *"Token quota nearly exhausted. Strongly recommend ending session or upgrading plan."*
- Subagent is spawned: *"Spawning subagent for [task] with token budget [X]."*

**Do NOT notify for:**
- Routine `/usage` checks (internal only)
- Effort adjustments for trivial tasks (internal optimization)

---

## 7. Commands Reference

| Command | Purpose |
|---------|---------|
| `/usage` | Check session token usage and quota |
| `/compact` | Compress conversation history |
| `/clear` | Clear entire conversation |
| `/model <name>` | Switch model (sonnet/opus/haiku) |
| `/effort <level>` | Set verbosity (low/medium/high) |

---

## 8. Sources & Rationale

- Anthropic cache invalidation triggers (model switches, images, effort changes)
- Community measurements: 246M tokens in 22h, 0.13% output, cache rewrites dominate cost
- Vision token costs: ~1k–5k per image (resolution-dependent)
- Subagent overhead: ~7×·token usage vs single agent
- **Quality-first principle:** Downgrading model/effort on complex tasks increases error risk and rework costs

---

## 9. Integration Notes

**To activate this policy:**
1. Add this file to your `CLAUDE.md` or reference it in your rules
2. Ensure Claude Code has permission to run `/usage` and `/compact`
3. Test with a long-running session to verify auto-compaction triggers
4. Monitor `/usage` output to confirm behavior adaptation

**Optional enhancements:**
- Log token usage to a file for post-session analysis
- Add custom thresholds (e.g., compact at 400k instead of 500k)
- Integrate with external usage monitoring tools
- Add task complexity classification (trivial/moderate/complex) for effort logic
