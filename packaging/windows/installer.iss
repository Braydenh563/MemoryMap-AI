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
;   "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" /DMyAppVersion=<__version__> packaging\windows\installer.iss

#define MyAppName "MemoryMap AI"

; **The version is src\memorymap\__init__.py's `__version__`, never typed
; here.** It used to come from MEMORYMAP_VERSION with a hard-coded "0.1.0"
; fallback, so a build whose environment forgot the variable was an installer
; that called itself 0.1.0 in Add/Remove Programs. The caller reads
; `__version__` and passes it as /DMyAppVersion=<it> (both workflows do); a
; build without it stops here rather than guessing. An ISPP line reader
; (FileOpen/FileRead in a #sub) did the reading first and found nothing on
; CI's Windows runner, so the reading moved to the caller, where it is one
; tested line of PowerShell. release.yml also passes MEMORYMAP_VERSION from
; the tag, and a tag that disagrees with the code stops the build.
#ifndef MyAppVersion
  #error Pass /DMyAppVersion=<__version__ from src\memorymap\__init__.py> to ISCC
#endif
#if GetEnv("MEMORYMAP_VERSION") != "" && GetEnv("MEMORYMAP_VERSION") != MyAppVersion
  #error MEMORYMAP_VERSION (the release tag) does not match __version__ in src\memorymap\__init__.py
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
; The frozen app is a 64-bit build (PyInstaller on 64-bit Python). Without
; these, 32-bit Windows could install an exe that cannot start. x64compatible
; also admits Windows on ARM, which runs x64 programs under emulation.
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
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

[InstallDelete]
; **An upgrade replaces the bundle, it does not merge into it.** [Files]
; only adds and overwrites, so every file an older build had and this one
; does not (a module that moved, a DLL from a different PyInstaller or
; Python, a frontend file that was renamed) stayed in the install folder
; for good. Windows searches the program's own folder for DLLs, so a stale
; one there can be loaded in place of the bundle's. _internal is
; PyInstaller's folder and holds nothing of the person's (the notes are in
; %APPDATA%), so it goes whole before the new one is copied in.
Type: filesandordirs; Name: "{app}\_internal"

[Files]
; Everything PyInstaller's COLLECT step produced, recursively — the exe
; plus every DLL, the bundled frontend/ folder, and its own Python runtime.
Source: "..\..\dist\MemoryMap AI\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
; The post-install script for optional packages. Placed in {app} so it is
; available alongside the installed app, and uninstalled with it.

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
; The optional packages ticked on the wizard page, installed by the app
; itself (`--install-extras`, core/extras.py `install_blocking`): the same
; code Settings > Packages runs, which installs where a packaged build can
; import from. As the person who ran the installer, not the elevated
; account, because the packages go in their data folder.
;
; Not in a silent install unless asked for (GetSelectedExtras): the app's
; own updater runs this installer with /VERYSILENT, and with the page's
; defaults that re-ran a 2 GB search-by-meaning download, hidden, inside
; every update, while the person was told to reopen the app in a minute.
; A scripted install names what it wants: /EXTRAS=documents,pdfpages.
; Not run here any more (the owner, 2026-10-07: Setup froze on this line for
; the minutes torch takes, no progress, no minimise, no cancel). CurStepChanged
; writes the ticked ids to pending-extras.txt in the data folder, and the app
; installs them on first launch as a background task with progress and Stop
; (api/app.py `_install_pending_extras`).
; Launch the app after installation (existing behaviour).
Filename: "{app}\{#MyAppExeName}"; Parameters: "--desktop"; Description: "Launch {#MyAppName} now"; Flags: nowait postinstall skipifsilent
; The in-app updater's silent install reopens the app it closed: it passes
; /RELAUNCH=1 (routes_update.py), and only a silent install honours it, so a
; scripted fleet install (/VERYSILENT alone) never opens a window on a
; machine nobody is sitting at. runasoriginaluser: the person's own account.
Filename: "{app}\{#MyAppExeName}"; Parameters: "--desktop"; Flags: nowait runasoriginaluser; Check: ShouldRelaunch

[UninstallDelete]
; The app's own data (notes, attachments, preferences) lives under the
; user's AppData\Roaming\MemoryMap AI (config._default_data_dir, only used
; when sys.frozen — see that function's own comment), not under {app} —
; deliberately outside this section. Uninstalling removes the *program*;
; someone's notebook is not a build artifact and does not go with it.
; The optional packages (python-extras in the same folder) are asked about
; at the end instead (CurUninstallStepChanged, below), never deleted silently.
;
; What does go: a `data` folder inside the install folder, which builds
; before 0.3.3 wrote the window's cache and the launch log into when Windows
; started them there (__main__.py read MEMORYMAP_DATA_DIR with a bare "data"
; fallback; core/config.resolved_data_dir replaced it). Never notes: the
; database always went to AppData. Only the two folders by name, so anything
; else someone put there stays.
Type: filesandordirs; Name: "{app}\data\webview"
; Anything the running app wrote inside its own bundle (a bytecode cache, a
; file an extra unpacked) is not in the uninstall log; the folder is ours
; whole, so it goes whole, and the install folder is left empty.
Type: filesandordirs; Name: "{app}\_internal"
Type: filesandordirs; Name: "{app}\data\logs"
Type: dirifempty; Name: "{app}\data"

[Code]
{ Custom wizard page: optional package selection.

  Three checkboxes. Search by meaning starts ticked, because it is the
  default search engine and the app would otherwise install it on first
  use anyway; the other two start unticked. The page appears between the Task selection
  page and the Ready to Install page, matching the Inno Setup wizard flow.

  The IDs match core/extras.py's EXTRAS allowlist, so the same packages are
  offered here as in Settings > Packages inside the running app. }

var
  ExtrasPage: TWizardPage;
  ChkSemantic: TNewCheckBox;
  ChkVoice: TNewCheckBox;
  ChkDocuments: TNewCheckBox;

function HasPythonCore(RootKey: Integer): Boolean;
{ PEP 514: every python.org and Microsoft Store Python registers itself
  under Software\Python\PythonCore, in the user's hive or the machine's. }
var
  Names: TArrayOfString;
begin
  Result := RegGetSubkeyNames(RootKey, 'Software\Python\PythonCore', Names)
    and (GetArrayLength(Names) > 0);
end;

function PythonFound: Boolean;
{ Whether the app will find a Python to download packages with
  (core/extras.py find_system_python: python, python3, then the py
  launcher). The packaged app carries its own Python, but pip cannot run
  from inside it, so the downloads borrow the system's. Read, never run:
  the registry, and the launcher's two standard places. }
begin
  Result := HasPythonCore(HKCU) or HasPythonCore(HKLM)
    or FileExists(ExpandConstant('{win}\py.exe'))
    or FileExists(ExpandConstant('{localappdata}\Programs\Python\Launcher\py.exe'));
  if (not Result) and IsWin64 then
    Result := HasPythonCore(HKLM64);
end;

procedure InitializeWizard;
var
  Lbl: TNewStaticText;
  Y: Integer;
  HavePython: Boolean;
  PageNote: String;
begin
  HavePython := PythonFound;
  { The page's own line says what the downloads need. With no Python the
    boxes start unticked: the install step runs hidden, so a ticked box
    would download nothing and say nothing. }
  if HavePython then
    PageNote := 'Pick the extra features to download now.'
  else
    PageNote := 'Python was not found, and these downloads need it. Install'
      + ' it from python.org first, or add these later.';
  ExtrasPage := CreateCustomPage(
    wpSelectTasks,
    'Optional packages',
    PageNote + #13#10 + 'You can add or remove them later in Settings > Packages.'
  );

  { Every row is placed under the one above by its real height, not a fixed
    step: at 125% display scaling a wrapped line is taller than the old
    pixel steps allowed, and the checkboxes drew over the text above them
    (the owner at release). Labels size themselves (AutoSize with
    WordWrap); gaps go through ScaleY so they grow with the display. }
  Y := 0;

  { Header note }
  Lbl := TNewStaticText.Create(ExtrasPage);
  Lbl.Parent := ExtrasPage.Surface;
  Lbl.Left := 0;
  Lbl.Top := Y;
  Lbl.Width := ExtrasPage.SurfaceWidth;
  Lbl.AutoSize := True;
  Lbl.WordWrap := True;
  Lbl.Caption := 'All of these are optional. The app works without them,'
    + ' and each can be installed or removed at any time from inside the app.'
    + ' Downloading them needs Python from python.org on this computer.';
  Y := Lbl.Top + Lbl.Height + ScaleY(16);

  { Semantic search }
  ChkSemantic := TNewCheckBox.Create(ExtrasPage);
  ChkSemantic.Parent := ExtrasPage.Surface;
  ChkSemantic.Left := 0;
  ChkSemantic.Top := Y;
  ChkSemantic.Width := ExtrasPage.SurfaceWidth;
  ChkSemantic.Height := ScaleY(17);
  ChkSemantic.Caption := 'Search by meaning (about 2 GB, recommended)';
  ChkSemantic.Checked := HavePython;
  Y := Y + ScaleY(20);

  Lbl := TNewStaticText.Create(ExtrasPage);
  Lbl.Parent := ExtrasPage.Surface;
  Lbl.Left := ScaleX(20);
  Lbl.Top := Y;
  Lbl.Width := ExtrasPage.SurfaceWidth - ScaleX(20);
  Lbl.AutoSize := True;
  Lbl.WordWrap := True;
  Lbl.Caption := 'Search for what you meant rather than the exact words.'
    + ' Without it, search falls back to keywords.';
  Y := Lbl.Top + Lbl.Height + ScaleY(12);

  { Voice notes }
  ChkVoice := TNewCheckBox.Create(ExtrasPage);
  ChkVoice.Parent := ExtrasPage.Surface;
  ChkVoice.Left := 0;
  ChkVoice.Top := Y;
  ChkVoice.Width := ExtrasPage.SurfaceWidth;
  ChkVoice.Height := ScaleY(17);
  ChkVoice.Caption := 'Voice notes (about 50 MB)';
  ChkVoice.Checked := False;
  Y := Y + ScaleY(20);

  Lbl := TNewStaticText.Create(ExtrasPage);
  Lbl.Parent := ExtrasPage.Surface;
  Lbl.Left := ScaleX(20);
  Lbl.Top := Y;
  Lbl.Width := ExtrasPage.SurfaceWidth - ScaleX(20);
  Lbl.AutoSize := True;
  Lbl.WordWrap := True;
  Lbl.Caption := 'Speak a note or question and have it transcribed locally.';
  Y := Lbl.Top + Lbl.Height + ScaleY(12);

  { Document import }
  ChkDocuments := TNewCheckBox.Create(ExtrasPage);
  ChkDocuments.Parent := ExtrasPage.Surface;
  ChkDocuments.Left := 0;
  ChkDocuments.Top := Y;
  ChkDocuments.Width := ExtrasPage.SurfaceWidth;
  ChkDocuments.Height := ScaleY(17);
  ChkDocuments.Caption := 'Documents in and out (about 40 MB)';
  ChkDocuments.Checked := False;
  Y := Y + ScaleY(20);

  Lbl := TNewStaticText.Create(ExtrasPage);
  Lbl.Parent := ExtrasPage.Surface;
  Lbl.Left := ScaleX(20);
  Lbl.Top := Y;
  Lbl.Width := ExtrasPage.SurfaceWidth - ScaleX(20);
  Lbl.AutoSize := True;
  Lbl.WordWrap := True;
  Lbl.Caption := 'Import PDFs (scanned ones too), Word files and slides as'
    + ' notes, and export documents to Word.';
end;

function GetSelectedExtras(Param: String): String;
{ Returns a comma-separated list of core/extras.py ids for the ticked boxes.
  Called from the [Run] section's code:GetSelectedExtras reference.

  A silent install (the in-app updater's /VERYSILENT) never reads the
  boxes, whose defaults would start a 2 GB download inside every update; it
  installs only what /EXTRAS= names, which is nothing unless a script asks. }
var
  Packages: String;
begin
  if WizardSilent then
  begin
    Result := ExpandConstant('{param:EXTRAS|}');
    exit;
  end;
  Packages := '';
  if ChkSemantic.Checked then
    Packages := Packages + 'semantic,';
  if ChkVoice.Checked then
    Packages := Packages + 'voice,';
  { One box, two extras: the page has room for three rows and no scroll, and
    reading scanned PDFs is the same user's wish as importing documents (the
    owner, 2026-09-24). Word files are written in the browser now. }
  if ChkDocuments.Checked then
    Packages := Packages + 'documents,pdfpages,';
  { Strip trailing comma }
  if Length(Packages) > 0 then
    Packages := Copy(Packages, 1, Length(Packages) - 1);
  Result := Packages;
end;

function HasSelectedExtras: Boolean;
{ Check function for the [Run] entry: only run the install when at least
  one box was ticked. }
begin
  Result := (GetSelectedExtras('') <> '');
end;

procedure CurStepChanged(CurStep: TSetupStep);
{ The ticked packages, for the app to install on its first launch. }
var
  Dir: String;
begin
  if (CurStep = ssPostInstall) and HasSelectedExtras then
  begin
    Dir := ExpandConstant('{userappdata}\MemoryMap AI');
    ForceDirectories(Dir);
    SaveStringToFile(Dir + '\pending-extras.txt', GetSelectedExtras(''), False);
  end;
end;

function ShouldRelaunch: Boolean;
{ Check function for the relaunch [Run] entry. Silent only: an interactive
  install has the "Launch now" checkbox for this. }
begin
  Result := WizardSilent and (ExpandConstant('{param:RELAUNCH|0}') = '1');
end;

// The optional packages on uninstall (the owner, 2026-09-24: "yes" to
// offering to delete them). They live beside the notebook in the user's
// AppData, and search by meaning alone can be about 2 GB, so a program that
// is gone should not quietly keep them. Asked, never assumed: a reinstall
// would find them again, and a silent uninstall (the updater's) keeps them.
// The notebook itself is never touched.
//
// Two folders, not one: pip's packages go in python-extras, and the extras
// the app downloads itself (Pyodide, needle's 36 MB model) go in extras
// (core/extra_downloads.py). Only the first was asked about, so "yes" left
// the downloads behind with the program gone.
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  Extras: String;
  Downloads: String;
begin
  if CurUninstallStep <> usPostUninstall then
    Exit;
  Extras := ExpandConstant('{userappdata}\{#MyAppName}\python-extras');
  Downloads := ExpandConstant('{userappdata}\{#MyAppName}\extras');
  if (not DirExists(Extras)) and (not DirExists(Downloads)) then
    Exit;
  if UninstallSilent then
    Exit;
  if MsgBox('Also delete the optional packages you downloaded (such as search by meaning)?'
      + #13#10 + #13#10 + 'Your notes are kept either way.',
      mbConfirmation, MB_YESNO) = IDYES then
  begin
    if DirExists(Extras) then
      DelTree(Extras, True, True, True);
    if DirExists(Downloads) then
      DelTree(Downloads, True, True, True);
  end;
end;
