; Inno Setup script for the Windows installer.
;
; Built in CI (.github/workflows/release.yml) with ISCC.exe, from the
; "MemoryMap AI" folder PyInstaller's COLLECT step produces (see
; memorymap.spec in this same folder) — build that first, this script
; expects it to already exist one directory up as ..\..\dist\MemoryMap AI\.
;
; Per-user install (PrivilegesRequired=lowest): no admin elevation prompt,
; on top of the "ship unsigned for now" SmartScreen warning this build
; already asks someone to click through once. Installs to the per-user
; Programs folder rather than Program Files, which is also where a
; standard (non-admin) Windows account can actually write without a UAC
; prompt at all.
;
; Local build/test (from a Windows machine, Inno Setup installed):
;   "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" packaging\windows\installer.iss

#define MyAppName "MemoryMap AI"
#define MyAppVersion GetEnv("MEMORYMAP_VERSION")
#if MyAppVersion == ""
  #define MyAppVersion "0.1.0"
#endif
#define MyAppPublisher "MemoryMap AI"
#define MyAppURL "https://github.com/Braydenh563/MemoryMap-AI"
#define MyAppExeName "MemoryMap AI.exe"

[Setup]
AppId={{B4C6E3F1-6E6A-4B7E-9C1D-3F6A2E8D9C40}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}/issues
AppUpdatesURL={#MyAppURL}/releases
; Per-user, not per-machine — see the header comment above.
PrivilegesRequired=lowest
DefaultDirName={autopf}\{#MyAppName}
DisableProgramGroupPage=yes
; The installer's own .exe icon, and the icon shown in Add/Remove Programs.
SetupIconFile=..\..\frontend\icon.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
OutputDir=..\..\dist\installer
; **Version, platform and architecture, like the Linux package already has.**
; Asked for directly. `MemoryMap-AI-Setup-0.3.1.exe` says nothing about what
; it installs onto, so two files downloaded a month apart from different
; machines are indistinguishable in a Downloads folder, and a 64-bit build
; and a future 32-bit or ARM one would overwrite each other. The Linux side
; has read `MemoryMap-AI-<version>-linux-x86_64.zip` all along; this is the
; same name in the same order.
;
; x86_64 rather than Inno's own "x64": it is what the Linux artefact says and
; what `uname -m` prints, and one spelling across both downloads is worth
; more than matching a single installer's internal vocabulary.
OutputBaseFilename=MemoryMap-AI-Setup-{#MyAppVersion}-windows-x86_64
; Not signed yet (deliberate — see README's Windows install note). Revisit
; once there's a certificate; nothing else about this script would need to
; change, Inno Setup signs in a separate post-build step, not here.

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop shortcut"; GroupDescription: "Additional shortcuts:"; Flags: unchecked

[Files]
; Everything PyInstaller's COLLECT step produced, recursively — the exe
; plus every DLL, the bundled frontend/ folder, and its own Python runtime.
Source: "..\..\dist\MemoryMap AI\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
; The post-install script for optional packages. Placed in {app} so it is
; available alongside the installed app, and uninstalled with it.
Source: "install-extras.ps1"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
; --desktop: the installed app always opens in its own window, never the
; bare-server mode — that mode is for a source checkout run from a
; terminal, not something a Start Menu shortcut should offer as a choice.
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Parameters: "--desktop"; IconFilename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Parameters: "--desktop"; IconFilename: "{app}\{#MyAppExeName}"; Tasks: desktopicon
; INBOX 253, one-click recovery: beside the ordinary shortcut, not instead
; of it, in the same Start Menu group so it is findable the moment the
; ordinary one stops opening. Runs the packaged build's own --reinstall
; (main()/_repair_install in __main__.py) — there is no venv here to
; rebuild, so it clears the one thing this frozen build's own persistent
; window profile (storage_path under <data dir>\webview, CLAUDE.md's own
; trap note) can get stuck in, then opens the app normally; notes and
; preferences are never touched. Not on the Desktop (Tasks: desktopicon)
; on purpose — a repair shortcut is not something to click by habit.
Name: "{autoprograms}\{#MyAppName}\Repair {#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Parameters: "--desktop --reinstall"; IconFilename: "{app}\{#MyAppExeName}"

[Run]
; Install selected optional packages. Only runs when the user ticked at
; least one checkbox on the custom wizard page; the Check function below
; returns false when nothing was selected, skipping this step entirely.
; -ExecutionPolicy Bypass is required because the user's machine may have a
; restricted policy, and this script is part of our own installer.
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\install-extras.ps1"" -Packages ""{code:GetSelectedExtras}"""; StatusMsg: "Installing optional packages..."; Flags: runhidden; Check: HasSelectedExtras
; Launch the app after installation (existing behaviour).
Filename: "{app}\{#MyAppExeName}"; Parameters: "--desktop"; Description: "Launch {#MyAppName} now"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; The app's own data (notes, attachments, preferences) lives under the
; user's AppData\Roaming\MemoryMap AI (config._default_data_dir, only used
; when sys.frozen — see that function's own comment), not under {app} —
; deliberately outside this section. Uninstalling removes the *program*;
; someone's notebook is not a build artifact and does not go with it.

[Code]
{ Custom wizard page: optional package selection.

  Three checkboxes, all unchecked by default (these are large downloads and
  the app works without them). The page appears between the Task selection
  page and the Ready to Install page, matching the Inno Setup wizard flow.

  The IDs match core/extras.py's EXTRAS allowlist, so the same packages are
  offered here as in Settings > Packages inside the running app. }

var
  ExtrasPage: TWizardPage;
  ChkSemantic: TNewCheckBox;
  ChkVoice: TNewCheckBox;
  ChkDocuments: TNewCheckBox;

procedure InitializeWizard;
var
  Lbl: TNewStaticText;
  Y: Integer;
begin
  ExtrasPage := CreateCustomPage(
    wpSelectTasks,
    'Optional Packages',
    'Select optional features to install. These require Python on your PATH.'
    + #13#10 + 'You can also install them later from Settings > Packages.'
  );

  Y := 8;

  { Header note }
  Lbl := TNewStaticText.Create(ExtrasPage);
  Lbl.Parent := ExtrasPage.Surface;
  Lbl.Left := 0;
  Lbl.Top := Y;
  Lbl.Width := ExtrasPage.SurfaceWidth;
  Lbl.WordWrap := True;
  Lbl.Caption := 'All of these are optional. The app works without them,'
    + ' and each can be installed or removed at any time from inside the app.';
  Y := Y + 48;

  { Semantic search }
  ChkSemantic := TNewCheckBox.Create(ExtrasPage);
  ChkSemantic.Parent := ExtrasPage.Surface;
  ChkSemantic.Left := 0;
  ChkSemantic.Top := Y;
  ChkSemantic.Width := ExtrasPage.SurfaceWidth;
  ChkSemantic.Caption := 'Search by meaning (sentence-transformers) — ~2 GB';
  ChkSemantic.Checked := False;
  Y := Y + 24;

  Lbl := TNewStaticText.Create(ExtrasPage);
  Lbl.Parent := ExtrasPage.Surface;
  Lbl.Left := 24;
  Lbl.Top := Y;
  Lbl.Width := ExtrasPage.SurfaceWidth - 24;
  Lbl.WordWrap := True;
  Lbl.Caption := 'Search for what you meant rather than the exact words.'
    + ' Without it, search falls back to keywords.';
  Y := Y + 44;

  { Voice notes }
  ChkVoice := TNewCheckBox.Create(ExtrasPage);
  ChkVoice.Parent := ExtrasPage.Surface;
  ChkVoice.Left := 0;
  ChkVoice.Top := Y;
  ChkVoice.Width := ExtrasPage.SurfaceWidth;
  ChkVoice.Caption := 'Voice notes (faster-whisper) — ~50 MB';
  ChkVoice.Checked := False;
  Y := Y + 24;

  Lbl := TNewStaticText.Create(ExtrasPage);
  Lbl.Parent := ExtrasPage.Surface;
  Lbl.Left := 24;
  Lbl.Top := Y;
  Lbl.Width := ExtrasPage.SurfaceWidth - 24;
  Lbl.WordWrap := True;
  Lbl.Caption := 'Speak a note or question and have it transcribed locally.';
  Y := Y + 32;

  { Document import }
  ChkDocuments := TNewCheckBox.Create(ExtrasPage);
  ChkDocuments.Parent := ExtrasPage.Surface;
  ChkDocuments.Left := 0;
  ChkDocuments.Top := Y;
  ChkDocuments.Width := ExtrasPage.SurfaceWidth;
  ChkDocuments.Caption := 'Import documents (markitdown) — ~20 MB';
  ChkDocuments.Checked := False;
  Y := Y + 24;

  Lbl := TNewStaticText.Create(ExtrasPage);
  Lbl.Parent := ExtrasPage.Surface;
  Lbl.Left := 24;
  Lbl.Top := Y;
  Lbl.Width := ExtrasPage.SurfaceWidth - 24;
  Lbl.WordWrap := True;
  Lbl.Caption := 'Import PDFs, Word files and slides as notes.';
end;

function GetSelectedExtras(Param: String): String;
{ Returns a comma-separated list of package names for the selected extras.
  Called from the [Run] section's {code:GetSelectedExtras} reference. }
var
  Packages: String;
begin
  Packages := '';
  if ChkSemantic.Checked then
    Packages := Packages + 'sentence-transformers,';
  if ChkVoice.Checked then
    Packages := Packages + 'faster-whisper,';
  if ChkDocuments.Checked then
    Packages := Packages + 'markitdown,';
  { Strip trailing comma }
  if Length(Packages) > 0 then
    Packages := Copy(Packages, 1, Length(Packages) - 1);
  Result := Packages;
end;

function HasSelectedExtras: Boolean;
{ Check function for the [Run] entry: only run install-extras.ps1 when
  at least one checkbox was ticked. }
begin
  Result := (GetSelectedExtras('') <> '');
end;
