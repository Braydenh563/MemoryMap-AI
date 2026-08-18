# Releasing MemoryMap AI

A step-by-step walkthrough for cutting a new version and publishing the
Windows installer. Everything after you push a tag is automatic — this
document is mostly about the handful of things to get right *before* that.

- [Quick reference](#quick-reference)
- [Before you tag: the checklist](#before-you-tag-the-checklist)
- [Tagging and pushing](#tagging-and-pushing)
- [What happens automatically](#what-happens-automatically)
- [Verifying the release](#verifying-the-release)
- [If something goes wrong](#if-something-goes-wrong)
- [Re-releasing / patching a bad release](#re-releasing--patching-a-bad-release)
- [Version numbering](#version-numbering)

## Quick reference

For when you've done this before and just need the commands:

```
# 1. Bump the version
#    Edit src/memorymap/__init__.py: __version__ = "0.2.0"

# 2. Rename the changelog header (both copies)
#    CHANGELOG.md and docs/CHANGELOG.md:
#    "## [Unreleased]"  ->  "## [0.2.0] - 2026-08-18"

# 3. Commit
git add src/memorymap/__init__.py CHANGELOG.md docs/CHANGELOG.md
git commit -m "Release 0.2.0"
git push

# 4. Tag and push the tag — this is what actually triggers the release
git tag v0.2.0
git push origin v0.2.0

# 5. Watch: https://github.com/Braydenh563/MemoryMap-AI/actions
#    Two jobs run in order: github-release (fast), then
#    build-windows-installer (~10-15 min). When both are green, the
#    installer is attached to the release automatically.
```

That's the whole thing. Nothing else to build or upload by hand.

## Before you tag: the checklist

Three things have to be true before pushing a tag, because the release
pipeline reads them but doesn't set them for you.

### 1. Bump `__version__`

```python
# src/memorymap/__init__.py
__version__ = "0.2.0"
```

This is what shows in **Settings → About**, what the Windows installer's
own file properties report, and what the in-app update checker
(`GET /update/check`) compares against GitHub's latest release tag. **If you
tag `v0.2.0` without bumping this, the app will call itself `0.1.0`
everywhere except the installer's filename** — a real, easy-to-miss
inconsistency, not a cosmetic one.

### 2. Rename the changelog header — in both copies

`CHANGELOG.md` keeps everything not yet released under `## [Unreleased]`.
Before tagging, rename that header to the version and today's date:

```diff
-## [Unreleased]
+## [0.2.0] - 2026-08-18
```

Then add a fresh empty `## [Unreleased]` above it, ready for the next round
of work:

```markdown
## [Unreleased]

## [0.2.0] - 2026-08-18
### Added
...
```

**Do this in `docs/CHANGELOG.md` too** — it's a byte-for-byte mirror of the
root file (GitHub Pages only serves `/docs`, so a copy lives there;
`tests/test_docs_site.py` fails the build if the two ever differ):

```
cp CHANGELOG.md docs/CHANGELOG.md
```

This matters beyond bookkeeping: the release workflow's `github-release` job
greps `CHANGELOG.md` for a header matching the tag's version number and uses
that section as the GitHub Release's description. Skip the rename and the
match comes back empty — the release still gets created, just with GitHub's
generic auto-generated notes (a list of commits) instead of your actual
changelog entry.

### 3. Everything else is already green

Push only from a state where CI is already passing on the branch you're
releasing from — the release workflow doesn't re-run the test suite itself,
it trusts that the code being tagged already passed CI on its way to `main`.

## Tagging and pushing

```
git tag v0.2.0
git push origin v0.2.0
```

The tag format matters: the workflow triggers on **`v*`** (`.github/workflows/release.yml`),
and the Windows build strips the leading `v` to get the version string it
bakes into the installer. Always tag `v0.2.0`, never `0.2.0` alone.

Tag from a commit that's already on `main` (or whichever branch you release
from) — tagging a branch tip that hasn't been merged yet ships code nobody
else has reviewed.

## What happens automatically

Pushing the tag fires `.github/workflows/release.yml`, two jobs in sequence:

**1. `github-release`** (~30 seconds)
Creates the actual GitHub Release for the tag, with the description pulled
from `CHANGELOG.md`'s matching section (see above).

**2. `build-windows-installer`** (~10–15 minutes, real Windows hardware via
`windows-latest`)
- Installs a trimmed dependency set — deliberately **without**
  `sentence-transformers`/torch (Settings → Packages already treats those as
  an optional post-install, same as voice dictation and the desktop window
  itself; bundling a multi-hundred-MB download into the base installer would
  contradict that).
- Runs PyInstaller against `packaging/windows/memorymap.spec` (onedir build
  — a onefile build would re-extract itself on every single launch, a bad
  fit for something meant to open like a normal desktop app).
- Runs Inno Setup against `packaging/windows/installer.iss`, which reads the
  version from the tag via the `MEMORYMAP_VERSION` environment variable.
- Uploads `MemoryMap-AI-Setup-<version>.exe` to the release the first job
  just created.

Nothing is published to PyPI — deliberate, see the comment at the top of
`release.yml`. This app ships as a Windows installer via GitHub Releases,
not as something `pip install`s.

## Verifying the release

1. Open the [Actions tab](https://github.com/Braydenh563/MemoryMap-AI/actions)
   and confirm both jobs finished green. The Windows job is the one that can
   genuinely fail (a dependency version drift, an Inno Setup syntax error,
   PyInstaller missing a hidden import) — watch it, don't assume green.
2. Open the [release itself](https://github.com/Braydenh563/MemoryMap-AI/releases)
   and confirm:
   - the description matches what you wrote in `CHANGELOG.md`, not the
     generic auto-generated notes (a sign the header rename was missed);
   - `MemoryMap-AI-Setup-<version>.exe` is attached as an asset.
3. **If you can get to a Windows machine, actually run the installer once.**
   Nothing in this pipeline runs an end-to-end install-and-launch test —
   PyInstaller and Inno Setup both succeeding is evidence the *build* works,
   not that the resulting app opens cleanly on a real machine with a real
   user profile. This is the one step in this whole document that is
   "should work" rather than "verified," and it's worth closing that gap on
   the first release after any packaging change (`memorymap.spec`,
   `installer.iss`, or the CI job itself).

## If something goes wrong

**The Windows job fails.** Read its log on the Actions tab — PyInstaller
failures usually name a missing hidden import (add it to
`packaging/windows/memorymap.spec`'s `hiddenimports` list); Inno Setup
failures usually name a bad path or a missing `MEMORYMAP_VERSION`. Fix the
underlying file, commit, and re-tag (see below) — there's no way to re-run
just the failed job against the same tag with a fix, since the fix has to
be in the tagged commit.

**The changelog section is empty / generic notes appeared instead.** The
header rename in `CHANGELOG.md` didn't match the tag's version number
exactly (check for a typo, or a version in the header that doesn't match
what you tagged). Edit the release description by hand on GitHub — no need
to re-tag just for this, the changelog text doesn't affect the build.

**You tagged the wrong commit, or want to change something before anyone
downloads it.** See the next section — don't force-push the tag.

## Re-releasing / patching a bad release

**Never force-push an existing tag.** If `v0.2.0` is wrong, don't try to
move it — delete it and the release, then ship the fix as `v0.2.1`:

```
# Delete the tag locally and on GitHub
git tag -d v0.2.0
git push origin :refs/tags/v0.2.0

# Also delete the GitHub Release itself (Releases page -> the release -> Delete)
# so a stale asset doesn't linger under a tag that no longer exists.
```

Then fix the actual problem, bump to `0.2.1`, and go through the checklist
again from the top. A version number that got burned on a bad build is a
normal, cheap thing to skip past — it's not worth fighting the tag to reuse
it.

## Version numbering

This project is `0.x` while it stabilises (see `README.md`'s badge and
`CHANGELOG.md`'s own header). Loosely:

- **Patch** (`0.1.0` → `0.1.1`) — bug fixes, no new features, nothing that
  changes how existing features behave.
- **Minor** (`0.1.0` → `0.2.0`) — new features, meaningful behavior changes,
  the normal case for most releases at this stage.
- There's no `1.0` criteria written down yet — that's a decision to make
  deliberately when it comes up, not a version-numbering rule to follow
  automatically.
