"""The release workflow runs what it built before it publishes it.

The 0.2.x packaged build died at launch (uvicorn's formatter on a console-
less process, INBOX 251) and nothing in the workflow could have noticed:
it built, packaged and uploaded without starting the binary once. Both
package jobs now start the frozen app and wait for its page, before the
step that packages or uploads it.

The Windows job also builds an MSI (packaging/windows/installer.wxs)
alongside the existing Inno Setup .exe, the owner's explicit decision:
both ship, the MSI unsigned for now, for `msiexec /quiet`, Group Policy
deployment and Windows Installer's own repair/rollback. **The MSI build is
`if: false` as of 2026-09-21**: WiX Toolset v7 now refuses to build without
accepting its Open Source Maintenance Fee EULA (WIX7015), and a failed step
in this job used to take the working .exe upload down with it. The step
stays in the file, disabled, until that is resolved one way or the other.
The tests below guard the same shape the smoke-test tests above guard for
the .exe: the MSI, when it is on, is built after the frozen app has been
proven to actually run and every release filename, on both platforms,
carries the app name, the version, the platform and the architecture, so
nobody downloading from the Releases page has to guess which file is which;
the upload step is guarded against expecting a file a disabled build will
never produce.
"""

import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = (ROOT / ".github" / "workflows" / "release.yml").read_text(encoding="utf-8")
WXS = ROOT / "packaging" / "windows" / "installer.wxs"


def _job(name: str) -> str:
    start = WORKFLOW.index(f"  {name}:\n")
    rest = WORKFLOW[start + 1 :]
    nxt = rest.find("\n  build-") if "\n  build-" in rest else -1
    return WORKFLOW[start:] if nxt < 0 else WORKFLOW[start : start + 1 + nxt]


def test_windows_job_smoke_tests_the_exe_before_the_installer():
    job = _job("build-windows-installer")
    smoke = job.index("Smoke test the frozen app")
    assert 'MemoryMap AI.exe" &' in job[smoke:]
    assert smoke < job.index("Install Inno Setup")


def test_linux_job_smoke_tests_the_binary_before_packing():
    job = _job("build-linux-package")
    smoke = job.index("Smoke test the frozen app")
    assert 'MemoryMap AI" &' in job[smoke:]
    #: Named "Pack the build" since the Linux download became a tarball as
    #: well as a zip. This test caught the rename, which is what it is for:
    #: the assertion is that the smoke test runs *before* whatever packages
    #: the thing, and a step it cannot find is a step it cannot order.
    assert smoke < job.index("Pack the build")


def test_the_linux_package_ships_a_tarball_as_well_as_a_zip():
    """A zip does not reliably carry the executable bit on Linux.

    Measured on a 755 file: `unzip` restores 755, Python's
    `zipfile.extractall` gives 644, and `tar` gives 755 either way. A 644
    launcher is a download that cannot be started, with nothing on screen
    saying why, so the tarball is the one that has to exist.
    """
    job = _job("build-linux-package")
    pack = job[job.index("Pack the build") :]
    assert "tar -czf" in pack and "linux-x86_64.tar.gz" in pack, (
        "the Linux package must include a tarball: a zip loses the executable "
        "bit for several common extractors"
    )
    assert "linux-x86_64.zip" in pack


def test_the_smoke_step_fails_loudly_and_shows_the_log():
    assert WORKFLOW.count("exit 1") >= 2
    assert "desktop-stdio.log" in WORKFLOW


def test_windows_job_builds_the_msi_after_the_smoke_test():
    job = _job("build-windows-installer")
    smoke = job.index("Smoke test the frozen app")
    msi_build = job.index("Build the .msi installer")
    assert smoke < msi_build, (
        "the MSI must be built after the smoke test proves the frozen app "
        "actually runs, same as the .exe installer"
    )


def test_windows_job_uploads_the_exe():
    job = _job("build-windows-installer")
    upload = job[job.index("Upload installers to the release") :]
    assert "MemoryMap-AI-Setup-*.exe" in upload, (
        "the .exe installer dropped out of the upload step's files: list"
    )


def test_the_msi_is_off_and_the_upload_step_does_not_expect_one():
    """The MSI build is `if: false` for now (2026-09-21): WiX Toolset v7
    refuses to build at all without accepting the Open Source Maintenance
    Fee EULA (WIX7015), and a failed step in this job took the working .exe
    upload down with it, since the upload step never runs after one.

    This is deliberately "the .msi glob is absent", not "the .msi steps are
    gone": the build steps stay in the file with `if: false` and a comment
    naming the two real fixes, so re-enabling one of them is a one-line
    change rather than writing the job back from scratch.
    """
    job = _job("build-windows-installer")
    msi_step = job[
        job.index("Build the .msi installer") : job.index("Upload installers to the release")
    ]
    assert "if: false" in msi_step, (
        "the .msi build step should be disabled (if: false) until WIX7015 "
        "is resolved, not deleted or silently re-enabled"
    )
    upload = job[job.index("Upload installers to the release") :]
    assert "windows-x86_64.msi" not in upload, (
        "the upload step still expects a .msi that the disabled build step "
        "will never produce, which fails the whole job on a missing glob"
    )


def test_windows_msi_filename_carries_name_version_platform_and_arch():
    # The brief's own naming convention (<name>-<version>-<platform>-<arch>),
    # matched to what the Linux job already produces
    # (MemoryMap-AI-${VERSION}-linux-x86_64.zip), so the exact same shape
    # of filename identifies a MemoryMap AI release on either platform.
    job = _job("build-windows-installer")
    msi_step = job[job.index("Build the .msi installer") : job.index("Upload installers to the release")]
    assert "MemoryMap-AI-" in msi_step, "the MSI filename is missing the app name"
    assert "$env:MEMORYMAP_VERSION" in msi_step, "the MSI filename is missing the version"
    assert "windows-x86_64" in msi_step, "the MSI filename is missing the platform/arch"
    assert msi_step.count(".msi") >= 1, "the built file is missing the .msi extension"


def test_windows_exe_filename_carries_name_version_platform_and_arch():
    # The .exe's own filename is set in installer.iss (OutputBaseFilename),
    # not in release.yml, which only globs for it at upload time
    # (MemoryMap-AI-Setup-*.exe): a glob that would still match a filename
    # with the platform/arch dropped from it. This is the lint on the actual
    # source of the name, matched to what installer.iss produces today,
    # MemoryMap-AI-Setup-{#MyAppVersion}-windows-x86_64.exe, the same shape
    # WORLD_CLASS_PLAN's H6 decisions section records.
    text = INSTALLER_ISS
    line = next(
        (ln for ln in text.splitlines() if ln.strip().startswith("OutputBaseFilename=")),
        "",
    )
    assert line, "installer.iss has no OutputBaseFilename= line"
    assert "MemoryMap-AI-Setup-" in line, "the .exe filename is missing the app name"
    assert "{#MyAppVersion}" in line, "the .exe filename is missing the version"
    assert "windows-x86_64" in line, "the .exe filename is missing the platform/arch"


def test_linux_zip_filename_carries_name_version_platform_and_arch():
    job = _job("build-linux-package")
    #: "Pack the build", not "Zip the build": the Linux job gained a tarball
    #: beside the zip and the step was renamed with it. A step name a test
    #: cannot find is a test that fails on the rename rather than on the
    #: thing it is about, which is exactly what happened here.
    zip_step = job[job.index("Pack the build") :]
    assert "MemoryMap-AI-" in zip_step, "the zip filename is missing the app name"
    assert "${VERSION}" in zip_step, "the zip filename is missing the version"
    assert "linux-x86_64" in zip_step, "the zip filename is missing the platform/arch"


def test_wix_install_step_runs_before_the_msi_is_built():
    job = _job("build-windows-installer")
    assert job.index("Install WiX") < job.index("Build the .msi installer"), (
        "the wix CLI must be installed before the step that invokes it"
    )


def test_installer_wxs_exists_and_is_well_formed_xml():
    assert WXS.exists(), "packaging/windows/installer.wxs is missing"
    # Raises ParseError (failing the test) on malformed XML: this is the
    # only check of the WiX source this suite can do without a Windows
    # runner and the wix CLI; it does not validate against the WiX schema
    # or attempt an actual `wix build`.
    ET.parse(WXS)


def test_installer_wxs_matches_the_exe_installer_on_name_publisher_and_version():
    text = WXS.read_text(encoding="utf-8")
    assert 'Name="MemoryMap AI"' in text, "the MSI's product name must match the .exe installer's AppName"
    assert 'Manufacturer="MemoryMap AI"' in text, (
        "the MSI's manufacturer must match the .exe installer's AppPublisher"
    )
    # Both installers take their version from the same workflow output
    # (needs.resolve-version.outputs.version / $MEMORYMAP_VERSION), so a
    # release always ships an .exe and an .msi carrying the same number.
    assert "$(var.Version)" in text, "the MSI's version must come from the build-time Version variable"


def test_installer_wxs_is_per_machine_with_a_start_menu_shortcut_and_no_data_deletion():
    text = WXS.read_text(encoding="utf-8")
    assert 'Scope="perMachine"' in text, (
        "the MSI must install per machine, unlike the per-user .exe (silent/GPO deploy is the MSI's whole point)"
    )
    assert "<Shortcut" in text and "ProgramMenuFolder" in text, "the MSI must add a Start Menu shortcut"
    assert 'Arguments="--desktop"' in text, "the shortcut must launch the desktop window, same as the .exe installer"
    # Same reasoning as installer.iss's own [UninstallDelete] comment: the
    # app's own notes/attachments live outside anything this package
    # installs. Checked at the mechanism, not the prose (this file's own
    # header comment names %APPDATA% precisely to explain that): no
    # component may target WiX's AppData standard directories, since that
    # is what would actually put someone's notebook inside the package.
    assert "AppDataFolder" not in text, (
        "the MSI must never install into or reference an AppData standard directory: "
        "a clean uninstall removes only the program, never the user's data"
    )
# --- INBOX 253: one-click recovery ------------------------------------------
#
# packaging/windows/installer.iss is the one Windows installer this branch
# builds (a `.wxs`/MSI installer was started on a separate, unmerged agent
# worktree and is not part of this checkout: see that worktree's own
# history if it lands later, there is nothing here to extend for it yet).
# No Windows runner exists in this sandbox to actually run the installer or
# click the shortcut it creates, so this reads the .iss source as text
# instead, the same approach TestOneLauncherTwoSpellings already takes for
# start.bat, and separately proves `--reinstall` really does something on
# a frozen build by importing __main__.py for real (still runnable here:
# it is plain Python, not a PyInstaller build).

INSTALLER_ISS = (ROOT / "packaging" / "windows" / "installer.iss").read_text(encoding="utf-8")
MAIN_PY = ROOT / "src" / "memorymap" / "__main__.py"


def test_a_repair_shortcut_exists_beside_the_ordinary_one():
    """The gate: this shortcut cannot be dropped silently. Matched by
    shape, not by exact text, so a copy-edit to the label does not fail
    this test for the wrong reason, but there must still be exactly one,
    it must run --reinstall, and it must sit in the same Start Menu group
    ({autoprograms}\\{#MyAppName}\\...) as the ordinary shortcut, not
    somewhere a person would never look after the ordinary one stops
    opening."""
    icons = INSTALLER_ISS[INSTALLER_ISS.index("[Icons]") :]
    repair_lines = [
        ln
        for ln in icons.splitlines()
        if ln.strip().startswith("Name:") and "--reinstall" in ln
    ]
    assert len(repair_lines) == 1, repair_lines
    (line,) = repair_lines
    assert '{autoprograms}\\{#MyAppName}\\' in line, line
    assert 'Filename: "{app}\\{#MyAppExeName}"' in line, line
    # --desktop too: a repair that lands in the bare server mode is not
    # what the ordinary shortcut (also --desktop, see the line above it)
    # promised, and confuses "did it work" with "did a window open".
    assert '"--desktop --reinstall"' in line, line


def test_the_repair_shortcut_is_not_the_ordinary_one_in_disguise():
    """A regression that renamed the ordinary shortcut's own Parameters to
    add --reinstall (fixing nothing: see the app-level test below for what
    --reinstall must still do at every ordinary launch) would pass a looser
    "the string --reinstall is in the file somewhere" check; this counts
    shortcuts instead."""
    icons = INSTALLER_ISS[INSTALLER_ISS.index("[Icons]") :]
    names = [ln for ln in icons.splitlines() if ln.strip().startswith("Name:")]
    assert len(names) == 3, names  # Start Menu, Desktop (optional task), Repair
    without_reinstall = [ln for ln in names if "--reinstall" not in ln]
    assert len(without_reinstall) == 2, without_reinstall


def test_reinstall_is_wired_into_main_and_never_touches_notes():
    """Imported for real, not just grepped: `--reinstall` has to actually
    reach `_repair_install` from argparse, and that function's own
    docstring is the record of the decision (INBOX 253) that a repair here
    means "clear the cached window profile", not "rebuild a venv that does
    not exist on a frozen build", read from the source directly, since
    __main__.main() only runs to completion inside a real desktop/server
    process this suite does not start."""
    import ast

    tree = ast.parse(MAIN_PY.read_text(encoding="utf-8"))
    functions = {
        node.name: node
        for node in ast.walk(tree)
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
    }
    assert "_repair_install" in functions, "no _repair_install() in __main__.py"
    repair_fn = functions["_repair_install"]
    # The CODE, not the docstring explaining what it deliberately does not
    # touch: that sentence would otherwise fail this exact check for
    # saying the right thing.
    body = [stmt for stmt in repair_fn.body if not isinstance(stmt, ast.Expr)]
    repair_code = "\n".join(ast.unparse(stmt) for stmt in body)
    # Notes live in the database; preferences in preferences.json. Neither
    # is reachable from here, because this function must never touch either.
    for off_limits in ("preferences.json", "Entry", "database", "get_db", "get_config"):
        assert off_limits not in repair_code, (off_limits, repair_code)
    assert "webview" in repair_code  # the one thing it is allowed to clear

    main_src = ast.get_source_segment(MAIN_PY.read_text(encoding="utf-8"), functions["main"])
    assert "args.reinstall" in main_src
    assert "_repair_install()" in main_src
    # Falls through to the ordinary startup path: a repair that does not
    # then open the app is not "one click" (INBOX 253's own phrase).
    reinstall_at = main_src.index("args.reinstall")
    desktop_at = main_src.index("args.desktop")
    assert reinstall_at < desktop_at


def test_the_msi_carries_the_same_repair_shortcut_as_the_exe_installer():
    """The two installers promise the same Start Menu. The .exe installer's
    Repair shortcut is gated above; this is the MSI's, matched by shape the
    same way: exactly one shortcut running --reinstall, on the same exe
    with --desktop, in the same component as the ordinary shortcut so the
    two come and go together."""
    import xml.etree.ElementTree as ET

    root = ET.fromstring(WXS.read_text(encoding="utf-8"))
    ns = {"w": root.tag[1:].split("}")[0]} if root.tag.startswith("{") else {}
    prefix = "w:" if ns else ""
    shortcuts = root.findall(f".//{prefix}Shortcut", ns)
    repair = [s for s in shortcuts if "--reinstall" in (s.get("Arguments") or "")]
    assert len(repair) == 1, [s.get("Id") for s in shortcuts]
    (shortcut,) = repair
    assert shortcut.get("Arguments") == "--desktop --reinstall"
    ordinary = [s for s in shortcuts if "--reinstall" not in (s.get("Arguments") or "")]
    assert len(ordinary) == 1, [s.get("Id") for s in shortcuts]
    assert shortcut.get("Target") == ordinary[0].get("Target")
    components = root.findall(f".//{prefix}Component", ns)
    homes = [c for c in components if shortcut in list(c)]
    assert homes and ordinary[0] in list(homes[0]), "the Repair shortcut is not beside the ordinary one"

