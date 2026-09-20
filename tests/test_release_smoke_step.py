"""The release workflow runs what it built before it publishes it.

The 0.2.x packaged build died at launch (uvicorn's formatter on a console-
less process, INBOX 251) and nothing in the workflow could have noticed:
it built, packaged and uploaded without starting the binary once. Both
package jobs now start the frozen app and wait for its page, before the
step that packages or uploads it.

The Windows job also builds an MSI (packaging/windows/installer.wxs)
alongside the existing Inno Setup .exe — the owner's explicit decision:
both ship, the MSI unsigned for now, for `msiexec /quiet`, Group Policy
deployment and Windows Installer's own repair/rollback. The tests below
guard the same shape the smoke-test tests above guard for the .exe: the
MSI is built after the frozen app has been proven to actually run, both
installers are uploaded (never one silently dropped by an edit to the
upload step), and every release filename — on both platforms — carries
the app name, the version, the platform and the architecture, so nobody
downloading from the Releases page has to guess which file is which.
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


def test_linux_job_smoke_tests_the_binary_before_zipping():
    job = _job("build-linux-package")
    smoke = job.index("Smoke test the frozen app")
    assert 'MemoryMap AI" &' in job[smoke:]
    assert smoke < job.index("Zip the build")


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


def test_windows_job_uploads_both_the_exe_and_the_msi():
    job = _job("build-windows-installer")
    upload = job[job.index("Upload installers to the release") :]
    assert "MemoryMap-AI-Setup-*.exe" in upload, (
        "the .exe installer dropped out of the upload step's files: list"
    )
    assert "MemoryMap-AI-*-windows-x86_64.msi" in upload, (
        "the .msi installer is missing from the upload step's files: list"
    )


def test_windows_msi_filename_carries_name_version_platform_and_arch():
    # The brief's own naming convention (<name>-<version>-<platform>-<arch>),
    # matched to what the Linux job already produces
    # (MemoryMap-AI-${VERSION}-linux-x86_64.zip) — so the exact same shape
    # of filename identifies a MemoryMap AI release on either platform.
    job = _job("build-windows-installer")
    msi_step = job[job.index("Build the .msi installer") : job.index("Upload installers to the release")]
    assert "MemoryMap-AI-" in msi_step, "the MSI filename is missing the app name"
    assert "$env:MEMORYMAP_VERSION" in msi_step, "the MSI filename is missing the version"
    assert "windows-x86_64" in msi_step, "the MSI filename is missing the platform/arch"
    assert msi_step.count(".msi") >= 1, "the built file is missing the .msi extension"


def test_linux_zip_filename_carries_name_version_platform_and_arch():
    job = _job("build-linux-package")
    zip_step = job[job.index("Zip the build") :]
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
    # Raises ParseError (failing the test) on malformed XML — this is the
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
