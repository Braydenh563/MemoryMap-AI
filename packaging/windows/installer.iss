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
OutputBaseFilename=MemoryMap-AI-Setup-{#MyAppVersion}
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

[Icons]
; --desktop: the installed app always opens in its own window, never the
; bare-server mode — that mode is for a source checkout run from a
; terminal, not something a Start Menu shortcut should offer as a choice.
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Parameters: "--desktop"; IconFilename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Parameters: "--desktop"; IconFilename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Parameters: "--desktop"; Description: "Launch {#MyAppName} now"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; The app's own data (notes, attachments, preferences) lives under the
; user's AppData\Roaming\MemoryMap AI (config._default_data_dir, only used
; when sys.frozen — see that function's own comment), not under {app} —
; deliberately outside this section. Uninstalling removes the *program*;
; someone's notebook is not a build artifact and does not go with it.
