# install-extras.ps1 — post-install optional dependency installer
#
# Called by installer.iss's [Run] section after the main files are copied,
# only when the user ticked at least one optional package on the custom
# wizard page. Runs pip install for each selected extra against the first
# Python found on PATH.
#
# Arguments (passed from Inno Setup):
#   -Packages "sentence-transformers,faster-whisper,markitdown"
#
# Exit code 0 on success, non-zero on any pip failure (logged but not fatal
# to the installer — the app works without these, they are explicitly optional).

param(
    [string]$Packages
)

if (-not $Packages) {
    Write-Host "No optional packages selected, nothing to install."
    exit 0
}

# --- Find Python --------------------------------------------------------
$python = $null
foreach ($name in @("python", "python3", "py")) {
    $found = Get-Command $name -ErrorAction SilentlyContinue
    if ($found) {
        $python = $found.Source
        break
    }
}

if (-not $python) {
    Write-Host ""
    Write-Host "=== No Python interpreter found ==="
    Write-Host ""
    Write-Host "Optional packages require Python to be installed."
    Write-Host "Install Python from https://python.org (tick 'Add to PATH'),"
    Write-Host "then install these packages from Settings > Packages inside the app."
    Write-Host ""
    Read-Host "Press Enter to continue"
    exit 0
}

Write-Host "Using Python: $python"
Write-Host ""

# --- Install each package -----------------------------------------------
$packageList = $Packages -split ","
$failed = @()

foreach ($pkg in $packageList) {
    $pkg = $pkg.Trim()
    if (-not $pkg) { continue }

    Write-Host "------------------------------------------------------------"
    Write-Host "  Installing: $pkg"
    Write-Host "------------------------------------------------------------"
    Write-Host ""

    # For sentence-transformers on Windows, use the CPU-only torch index
    # to avoid the broken XPU wheel (same as requirements.txt).
    $extraArgs = @()
    if ($pkg -eq "sentence-transformers") {
        $extraArgs = @(
            "--extra-index-url", "https://download.pytorch.org/whl/cpu"
        )
    }

    $allArgs = @("-m", "pip", "install", "--user", $pkg) + $extraArgs
    & $python @allArgs 2>&1 | ForEach-Object { Write-Host $_ }

    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "  [!] Failed to install $pkg (exit code $LASTEXITCODE)"
        Write-Host "      You can install it later from Settings > Packages."
        Write-Host ""
        $failed += $pkg
    } else {
        Write-Host ""
        Write-Host "  [OK] $pkg installed successfully."
        Write-Host ""
    }
}

# --- Summary -------------------------------------------------------------
Write-Host "============================================================"
if ($failed.Count -eq 0) {
    Write-Host "  All optional packages installed successfully."
} else {
    Write-Host "  Some packages failed to install: $($failed -join ', ')"
    Write-Host "  You can install them later from Settings > Packages."
}
Write-Host "============================================================"
Write-Host ""

if ($failed.Count -gt 0) {
    exit 1
}
exit 0
