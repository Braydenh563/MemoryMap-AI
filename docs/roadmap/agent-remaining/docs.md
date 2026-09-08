# Brief 16, the documentation: what is left

The docs agent was cut off by a rate limit after six files. Done, each in
the README's voice and checked against the code: INSTALL.md (its rewrite
was then superseded by the launcher agent's flag-accurate version in the
same merge, so INSTALL.md needs the voice pass again, over the version
that names the ten flags, the doctor and the uninstall options),
TROUBLESHOOTING.md, MODELS.md, PRIVACY.md, SECURITY.md, CONTRIBUTING.md.

Left, in the brief's order:

1. docs/INSTALL.md: the voice pass over the current file (keep every flag
   and option it names; they are real).
2. docs/ARCHITECTURE.md: tighten, remove stale claims, keep the section on
   driving the app in a browser and check its sweep names against
   scratchpad/ui-sweeps/.
3. docs/DESIGN.md: prose only, no rule changes; tests/test_style_scale.py
   reads it.
4. CHANGELOG.md: an "Unreleased" block for this week from the branch log
   since 2026-09-06, grouped by surface, one line each, no hashes.
5. docs/index.html: same voice, links valid.
6. The two expansion files (docs/memorymap-ai-expansion-gemini.docx,
   docs/memorymap-ai-expansion-perplexity.md): fold what is still true and
   not already planned into ANALYSIS.md section 114 as a pointer paragraph,
   then delete them.

Gate per file: tests/test_no_em_dashes.py test_docs_layout.py
test_style_scale.py, ruff check .; no table wider than three columns.
