# Contributing to MemoryMap AI

Thanks for your interest! This is a small, focused project with one strong
guiding principle, so a little context goes a long way.

## The one rule that shapes everything

**MemoryMap AI is 100% offline and local-first.** Every feature must work on the
user's own machine with no cloud dependency. The single exception is web search,
which is strictly opt-in and clearly marked. If an idea needs to phone home, it's
out of scope by design — but it's still welcome in a discussion.

A few more principles worth knowing (the full list is in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)):

- The app must stay usable with the AI (Ollama) turned off — degrade, never crash.
- Database migrations are **additive only** (new columns), so users never lose data.
- Shared state lives in exactly one place (`core/deps.py`); don't build your own
  `DatabaseManager` or `ConfigManager`.

## Getting set up

```bash
python3 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pip install -e .            # editable install — don't forget the dot
```

Run the app with `python -m memorymap` and open <http://localhost:8000>.

## Before you open a PR

Two commands, both fast and fully offline (no Ollama, no models needed):

```bash
pytest              # the full test suite
ruff check .        # lint
```

Or use the Makefile shortcut, which runs both:

```bash
make check          # lint + tests — the pre-push gate
```

Optional, to keep formatting tidy:

```bash
ruff format .       # auto-format (make format)
```

Prefer to catch problems automatically? Install the pre-commit hooks once and
the lint + hygiene checks run on every commit:

```bash
pip install pre-commit && pre-commit install
```

CI runs `ruff check` and `pytest` on Python 3.11, 3.12, and 3.13. Keep both
green. Run `make help` to see all the available tasks.

## Writing code that fits in

- Match the style of the file you're editing — naming, comment density, idioms.
  The codebase favours short explanatory comments that say *why*, not *what*.
- New behaviour needs a test. Copy an existing `tests/test_*.py` and reuse the
  AI fakes in `tests/fakes.py` / `tests/conftest.py` — never call real Ollama.
- If you touch the architecture (new module, new table, new data flow), update
  `docs/ARCHITECTURE.md` in the same PR.
- Add a bullet to `CHANGELOG.md` under "Unreleased".

## Commit & PR conventions

- Write clear, descriptive commit messages that explain the *why*.
- Keep PRs focused — one logical change per PR is easier to review.
- The PR template will prompt you for the essentials (what/why, how to test,
  the checklist). Fill it in.

## Reporting bugs & suggesting features

Use the issue templates — they ask the few questions that make a local-first app
easy to reproduce and reason about. For open-ended ideas, start a Discussion
instead of an issue.

## Security

Please don't file security problems as public issues. See
[`SECURITY.md`](SECURITY.md) for how to report them privately.
