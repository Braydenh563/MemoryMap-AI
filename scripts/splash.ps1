<#
  MemoryMap AI - launch splash.

  WHY THIS EXISTS
  ---------------
  Reported directly: the pre-launch work (git pull, building .venv, pip
  installing several hundred megabytes of dependencies) "takes a while to
  actually open the window so the user doesn't think the application didn't
  start properly because they didn't have access to the terminal logs".

  That gap is real and it is the worst one in the whole product. `__main__.py`
  already shows a loading window with a progress bar - but that window is
  created by Python, and everything above happens in start.bat *before* Python
  can run at all. On a first run, or any run where requirements.txt changed,
  that is minutes of a machine doing nothing visible. In console-less mode
  (show_console_on_startup = False, and the packaged build) there is not even a
  terminal to watch, so the only feedback is that double-clicking the icon
  appeared to do nothing.

  So: an Adobe-style splash, up within a second of the double-click, showing
  what is happening, handed off to the Python loading window when that appears.

  HOW IT TALKS TO THE LAUNCHER
  ----------------------------
  One status file, polled. The launcher writes a line of text into it at each
  phase; this reads it and repaints. Deliberately a file rather than a pipe or
  a named event: start.bat is cmd.exe, which can write a file with `echo >` and
  essentially nothing else, and a file also gives us the shutdown signal for
  free - when the file disappears, the launcher is done and this exits.

  Three independent ways to die, because a splash that outlives its launcher is
  worse than no splash at all: the status file says __done__, the status file is
  deleted, or MaxMinutes elapses. The last one is the backstop for a launcher
  killed with Ctrl+C or Task Manager, which deletes nothing on its way out.

  Everything here is best-effort. It is wrapped in a try/catch that exits
  quietly, and start.bat launches it detached and never checks whether it
  worked: a cosmetic window failing to appear must not stop the app starting.
#>
param(
  [Parameter(Mandatory = $true)][string]$StatusFile,
  [int]$MaxMinutes = 20
)

$ErrorActionPreference = "Stop"
try {
  Add-Type -AssemblyName System.Windows.Forms
  Add-Type -AssemblyName System.Drawing

  # Same palette as _LOADING_HTML in __main__.py, so the handoff from this
  # window to that one does not read as two different applications.
  $bg     = [System.Drawing.Color]::FromArgb(18, 20, 28)
  $ink    = [System.Drawing.Color]::FromArgb(231, 233, 238)
  $muted  = [System.Drawing.Color]::FromArgb(154, 161, 173)
  $accent = [System.Drawing.Color]::FromArgb(79, 109, 245)
  $track  = [System.Drawing.Color]::FromArgb(38, 43, 58)

  $form                 = New-Object System.Windows.Forms.Form
  $form.FormBorderStyle = "None"
  $form.StartPosition   = "CenterScreen"
  $form.Size            = New-Object System.Drawing.Size(460, 250)
  $form.BackColor       = $bg
  $form.TopMost         = $true
  $form.ShowInTaskbar   = $true
  $form.Text            = "Starting MemoryMap AI"

  # The mark, drawn rather than loaded. Same geometry as frontend/favicon.svg
  # (a hub with notes orbiting it on spokes). Drawing it avoids depending on a
  # file path that differs between a git checkout and the packaged build - and
  # this script may be running before the checkout has even finished updating.
  $logo = New-Object System.Windows.Forms.Panel
  $logo.Size     = New-Object System.Drawing.Size(64, 64)
  $logo.Location = New-Object System.Drawing.Point(28, 30)
  $logo.BackColor = $bg
  $logo.Add_Paint({
    param($src, $e)
    $g = $e.Graphics
    $g.SmoothingMode = "AntiAlias"
    $rect = New-Object System.Drawing.Rectangle(0, 0, 63, 63)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush -ArgumentList `
      $rect, `
      ([System.Drawing.Color]::FromArgb(91, 124, 255)), `
      ([System.Drawing.Color]::FromArgb(169, 39, 216)), `
      ([float]45.0)
    # A rounded tile, matching the favicon's rx=23 at a 100-unit viewBox.
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $r = 15
    $path.AddArc(0, 0, $r * 2, $r * 2, 180, 90)
    $path.AddArc(63 - $r * 2, 0, $r * 2, $r * 2, 270, 90)
    $path.AddArc(63 - $r * 2, 63 - $r * 2, $r * 2, $r * 2, 0, 90)
    $path.AddArc(0, 63 - $r * 2, $r * 2, $r * 2, 90, 90)
    $path.CloseFigure()
    $g.FillPath($brush, $path)

    # Five spokes and five notes, at the favicon's own coordinates scaled
    # from its 100-unit viewBox down to 64px.
    $s = 64.0 / 100.0
    $penColour = [System.Drawing.Color]::FromArgb(235, 255, 255, 255)
    $pen = New-Object System.Drawing.Pen -ArgumentList $penColour, ([float](5.5 * $s))
    $pen.StartCap = "Round"; $pen.EndCap = "Round"
    $white = New-Object System.Drawing.SolidBrush -ArgumentList ([System.Drawing.Color]::White)
    $nodes = @(@(50, 20), @(78.5, 40.7), @(67.6, 74.3), @(32.4, 74.3), @(21.5, 40.7))
    foreach ($n in $nodes) {
      $g.DrawLine($pen, (50 * $s), (50 * $s), ($n[0] * $s), ($n[1] * $s))
    }
    foreach ($n in $nodes) {
      $g.FillEllipse($white, (($n[0] - 7.5) * $s), (($n[1] - 7.5) * $s), (15 * $s), (15 * $s))
    }
    $hub = New-Object System.Drawing.SolidBrush -ArgumentList $accent
    $g.FillEllipse($hub, ((50 - 13) * $s), ((50 - 13) * $s), (26 * $s), (26 * $s))
    $g.FillEllipse($white, ((50 - 9.5) * $s), ((50 - 9.5) * $s), (19 * $s), (19 * $s))

    $pen.Dispose(); $white.Dispose(); $hub.Dispose(); $brush.Dispose(); $path.Dispose()
  })

  $title           = New-Object System.Windows.Forms.Label
  $title.Text      = "MemoryMap AI"
  $title.ForeColor = $ink
  $title.Font      = New-Object System.Drawing.Font -ArgumentList "Segoe UI", ([float]17), ([System.Drawing.FontStyle]::Bold)
  $title.Location  = New-Object System.Drawing.Point(108, 38)
  $title.Size      = New-Object System.Drawing.Size(320, 32)

  $tag             = New-Object System.Windows.Forms.Label
  $tag.Text        = "Your notebook, on your own machine"
  $tag.ForeColor   = $muted
  $tag.Font        = New-Object System.Drawing.Font -ArgumentList "Segoe UI", ([float]9)
  $tag.Location    = New-Object System.Drawing.Point(110, 70)
  $tag.Size        = New-Object System.Drawing.Size(320, 20)

  # Marquee, not a percentage. The launcher genuinely does not know how far
  # through a pip install it is, and a bar that sat at "30%" for four minutes
  # would be a worse lie than one that only says "still working".
  $bar          = New-Object System.Windows.Forms.ProgressBar
  $bar.Style    = "Marquee"
  $bar.MarqueeAnimationSpeed = 30
  $bar.Location = New-Object System.Drawing.Point(30, 138)
  $bar.Size     = New-Object System.Drawing.Size(400, 6)
  $bar.ForeColor = $accent
  $bar.BackColor = $track

  $status           = New-Object System.Windows.Forms.Label
  $status.Text      = "Starting…"
  $status.ForeColor = $muted
  $status.Font      = New-Object System.Drawing.Font -ArgumentList "Segoe UI", ([float]9)
  $status.Location  = New-Object System.Drawing.Point(30, 156)
  $status.Size      = New-Object System.Drawing.Size(400, 40)

  $hint             = New-Object System.Windows.Forms.Label
  $hint.Text        = "First run installs dependencies and can take a few minutes."
  $hint.ForeColor   = [System.Drawing.Color]::FromArgb(110, 116, 128)
  $hint.Font        = New-Object System.Drawing.Font -ArgumentList "Segoe UI", ([float]8)
  $hint.Location    = New-Object System.Drawing.Point(30, 206)
  $hint.Size        = New-Object System.Drawing.Size(400, 20)

  $form.Controls.AddRange(@($logo, $title, $tag, $bar, $status, $hint))

  # Borderless windows cannot be moved, and this one sits on top of everything.
  # Dragging it out of the way is the one interaction it needs.
  $drag = @{ on = $false; x = 0; y = 0 }
  $down = { param($s, $e) $drag.on = $true; $drag.x = $e.X; $drag.y = $e.Y }
  $move = {
    param($s, $e)
    if ($drag.on) {
      $form.Location = New-Object System.Drawing.Point(
        ($form.Location.X + $e.X - $drag.x), ($form.Location.Y + $e.Y - $drag.y))
    }
  }
  $up = { param($s, $e) $drag.on = $false }
  foreach ($c in @($form, $title, $tag, $hint)) {
    $c.Add_MouseDown($down); $c.Add_MouseMove($move); $c.Add_MouseUp($up)
  }

  $deadline = (Get-Date).AddMinutes($MaxMinutes)

  $timer          = New-Object System.Windows.Forms.Timer
  $timer.Interval = 250
  $timer.Add_Tick({
    try {
      if ((Get-Date) -gt $deadline) { $form.Close(); return }
      # Gone means the launcher finished (or died). Either way this window's
      # job is over — leaving it on top of the app would be the worst outcome.
      if (-not (Test-Path -LiteralPath $StatusFile)) { $form.Close(); return }
      $line = (Get-Content -LiteralPath $StatusFile -ErrorAction SilentlyContinue |
               Select-Object -Last 1)
      if ($null -eq $line) { return }
      $line = $line.Trim()
      if ($line -eq "__done__") { $form.Close(); return }
      if ($line -and $line -ne $status.Text) { $status.Text = $line }
    } catch {
      # A half-written file, or one locked mid-write by cmd's `echo >`. Both
      # are normal at 250ms polling and both resolve on the next tick.
    }
  })
  $timer.Start()

  [void]$form.ShowDialog()
  $timer.Stop()
  $form.Dispose()
} catch {
  # No PowerShell assemblies (Server Core), a blocked execution policy, a
  # remote session with no display. None of those are reasons to stop the app
  # from starting, and the launcher never checks our exit code.
  exit 0
}
