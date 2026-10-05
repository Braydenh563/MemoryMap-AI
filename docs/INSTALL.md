# Installing and running MemoryMap AI

There are three ways in. Pick the one that fits.

| You want | Use |
| --- | --- |
| No terminal, on Windows | [The Windows installer](#windows-installer) |
| No terminal, on Linux | [The Linux package](#linux-package) |
| Any operating system, one command | [The launcher script](#launcher-script) |
| To manage the Python environment yourself | [Manual setup](#manual-setup) |

- [Windows installer](#windows-installer)
- [Linux package](#linux-package)
- [Launcher script](#launcher-script)
- [Manual setup](#manual-setup)
- [Running it](#running-it)
- [Settings you can change before you start](#environment-variables)
- [Updating](#updating)
- [Uninstalling](#uninstalling)

## Windows installer

No terminal and no Python install are needed to run the app.

1. Download the latest `MemoryMap-AI-Setup-*.exe` from
   [Releases](https://github.com/Braydenh563/MemoryMap-AI/releases/latest).
2. Run it. Windows shows a blue "Windows protected your PC" screen, because
   this build is not code-signed yet. Click **More info**, then **Run anyway**.
   The installer copies the app into your own user folder: nothing
   system-wide, and no administrator prompt.
3. It adds a Start Menu shortcut, an optional desktop shortcut and a "Repair
   MemoryMap AI" shortcut, then offers to start the app.

The app opens in its own window. A tray icon keeps it running when you close
the window. The tray menu brings it back, starts a note, a question or a search,
opens Settings or the logs, and restarts or quits the app. If Settings, Packages shows the desktop window as installed but
no tray icon appears, reinstall that package from the same pane.

**Optional packages.** The installer's last page offers three boxes: search by
meaning (about 2 GB), voice notes, and document import with scanned-PDF
reading and Word export. All are optional, and each can be installed or
removed later from **Settings, Packages**. Downloading them needs Python from
[python.org](https://www.python.org/downloads/) on the same computer; the
default options of its installer are enough. Without one, the app works and
those features stay off.

**Where your notes live.** In `%APPDATA%\MemoryMap AI`. An update or a
reinstall leaves them alone, and so does uninstalling the app.

**Several machines.** The installer runs silently:
`MemoryMap-AI-Setup-<version>-windows-x86_64.exe /VERYSILENT /SUPPRESSMSGBOXES`.
A silent install downloads no optional packages unless you name them, for
example `/EXTRAS=documents,docx`. An MSI build for Group Policy exists in
`packaging/windows/installer.wxs`, but it is paused: its toolkit's new licence
terms stopped the release build, so releases carry the `.exe` only.

**The installer is a snapshot.** It does not update itself, and nothing
contacts GitHub until you ask: see [Updating](#updating).

## Linux package

1. Download `MemoryMap-AI-*-linux-x86_64.tar.gz` from the same
   [Releases](https://github.com/Braydenh563/MemoryMap-AI/releases/latest)
   page and unpack it with `tar -xzf`.
2. Run `MemoryMap AI` from the unpacked folder.

Use the tarball, not the `.zip` beside it. A zip does not reliably keep the
executable bit, so some archive managers unpack a launcher that will not
start. The window needs GTK and WebKit as system packages (on Debian and
Ubuntu: `python3-gi`, `python3-gi-cairo`, `gir1.2-gtk-3.0` and
`gir1.2-webkit2-4.1`). This build has no tray icon, so closing the window quits
the app. Your notes live in `~/.local/share/MemoryMap AI` (or under
`$XDG_DATA_HOME`).

## Launcher script

**You need Python 3.11 or newer.** If you have never used a terminal, follow
these steps exactly. Every code block is a command to copy and paste.

### 1. Open a terminal

- **Windows:** press `Win`, type `PowerShell`, press Enter.
- **macOS:** press `Cmd`+`Space`, type `Terminal`, press Enter.
- **Linux:** usually `Ctrl`+`Alt`+`T`, or look for "Terminal" in your app menu.

### 2. Get the app

Either way ends in a folder called `MemoryMap-AI`.

**With git:**

```
cd ~
git clone https://github.com/Braydenh563/MemoryMap-AI.git
cd MemoryMap-AI
```

**Without git:**

1. Open <https://github.com/Braydenh563/MemoryMap-AI> in your browser.
2. Click the green **Code** button, then **Download ZIP**.
3. Unzip it wherever you like.
4. In your terminal, type `cd ` (with a trailing space), drag the unzipped
   folder into the terminal window so it fills in the path, then press Enter.

You should now be inside the `MemoryMap-AI` folder. `ls` (macOS and Linux) or
`dir` (Windows) lists `start.sh`, `start-desktop.sh`, `start.bat`,
`start-desktop.bat` and `README.md`.

### 3. Run the launcher

- **Windows:** double-click `start-desktop.bat`, or type `start-desktop.bat` in
  the terminal. This opens the app in its own window. `start.bat` opens a
  browser tab instead.
- **macOS and Linux:** run `./start-desktop.sh` for the app's own window, or
  `./start.sh` for a browser tab.

The launcher builds a virtual environment, installs everything, starts the app
and opens <http://localhost:8000>. The first run takes a few minutes. After
that it goes straight to launching, and reinstalls only when
`requirements.txt` changes.

Every launch prints where it is running from, so you can find your way back:

```
Installed at: /home/you/MemoryMap-AI
Next time:    open a terminal there and run ./start.sh again
```

**The first launch also fetches the search model's package.** The built-in
search model (filing and search by meaning) needs `sentence-transformers`.
The launcher installs it with the other requirements. A packaged Windows or
Linux app installs it itself the first time it is needed: a one-time download
of several hundred MB (more on Windows, where it brings torch) that needs the
internet and can take several minutes. Settings, Search and index, Search
engine says when it is running, and Settings, Background tasks shows it. To
avoid it, install [Ollama](https://ollama.com), run
`ollama pull nomic-embed-text`, and pick that model under Ollama embedding
model in the same place.

### Launcher options

`start.sh` and `start.bat` take the same flags in the same order, and
`start-desktop.sh` and `start-desktop.bat` pass them straight through.
`--help` prints this list with the path to your notes.

| Flag | What it does |
| --- | --- |
| `desktop` | Start in the app's own window instead of a browser tab |
| `--port N` | Serve on port N instead of 8000 |
| `--no-browser` | Start the server without opening a browser |
| `--no-update` | Skip the update step and run the code that is here now |
| `--reinstall` | Rebuild the virtual environment from scratch, then start |
| `--doctor` | Check this machine, print a table and exit |
| `--logs` | Open the launcher log folder and exit |
| `--shortcut` | Create a desktop shortcut for this launcher and exit |
| `--version` | Print the version and exit |
| `--help` | Show the list and exit |

**If it does not start, run `--doctor` first.** It prints one row per thing
that can stop a launch, with a tick or a cross and, for a cross, one line on
what to do: Python's version and path, whether the virtual environment can
import what the server needs, free disk where your notes are, whether the port
is free or already has MemoryMap on it, the update setting and whether its
remote answers, your model provider, where your notes are and how big, and the
last error from the previous run's log. It exits 0 when everything checks out
and 1 when something needs fixing, and it works on a machine where the app
will not start.

Every run also writes `<your notes folder>/logs/launcher-<date>.log` and keeps
ten of them. `--logs` opens that folder.

## Manual setup

If you would rather not use the launcher:

```
# 1. A virtual environment
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# 2. Dependencies, then the app itself
pip install -r requirements.txt
pip install -e .                 # the dot matters: it means "this folder"

# 3. Optional: change where your notes live or where Ollama is
cp .env.example .env             # Windows: copy .env.example .env
```

The optional extras are easiest from **Settings, Packages**, which installs
and checks each one and needs no terminal. From a source install you can also
use pip:

```
pip install faster-whisper                # voice notes
pip install pywebview pystray Pillow      # the desktop window and its tray icon
pip install pypdfium2 Pillow              # read scanned PDFs
pip install "markitdown[pdf,docx,pptx]"   # import PDF, Word and PowerPoint
pip install python-docx                   # export a document to Word
pip install pytesseract Pillow            # text in images
```

The text-in-images extra also needs the `tesseract` program on your PATH,
which pip cannot install. The Settings button tries to install it for you
through winget, brew, apt, dnf or pacman; by hand:

```
sudo apt install tesseract-ocr    # Debian and Ubuntu
brew install tesseract            # macOS
# Windows: https://github.com/UB-Mannheim/tesseract/wiki
```

Without it, images simply do not get searchable text, and no upload fails.
Two extras are downloads rather than pip packages, so Settings, Packages is the
only place that fetches them: Run Python files (Pyodide) and Tool calling
without Ollama (needle). Both are pinned and checked against a sha256.

## Running it

```
python -m memorymap             # a browser tab at http://localhost:8000
python -m memorymap --desktop   # the same app in its own window
```

Without `pywebview`, `--desktop` falls back to a browser tab rather than
failing.

On first run you choose a password (bcrypt-hashed, kept on your machine). Then
add a model: see [MODELS.md](MODELS.md).

Other commands:

| Command | What it does |
| --- | --- |
| `python -m memorymap --export PATH` | Write your notes to PATH as a Markdown zip, then exit |
| `python -m memorymap --reset-password` | Clear a forgotten password so you can set a new one; private notes are lost |
| `python -m memorymap --capture` | Open a one-line capture window on the running app: bind it to a key in your system settings |
| `python -m memorymap.mcp_server` | A stdio MCP server over the app's own non-destructive tools, for another program on this computer (a source checkout only: the packaged app has no Python to run it with) |

### Environment variables

Set these in your environment, or in `.env` in the project folder for a source
install.

| Variable | Default | What it does |
| --- | --- | --- |
| `MEMORYMAP_DATA_DIR` | `data` beside a source checkout; the per-user app folder when installed | Where your notes, preferences, uploads and backups live |
| `MEMORYMAP_PORT` | `8000` | The port the server listens on (`--port` sets it for you) |
| `MEMORYMAP_LAN_PORT` | `8443` | The HTTPS port other devices use, when Settings, Account & security allows them |
| `OLLAMA_URL` | `http://localhost:11434` | Where Ollama listens |
| `MEMORYMAP_SEARXNG_PORT` | `8888` | The port for the SearXNG instance the app can run for web search |
| `MEMORYMAP_NO_AUTO_INSTALL` | unset | Set it to stop the app installing the search model's package by itself |
| `MEMORYMAP_EMBED_THREADS` | automatic | How many threads the built-in search model may use |
| `MEMORYMAP_RAM_GB` | detected | Overrides the memory the app thinks it has, for a container |
| `MEMORYMAP_EXTRAS_MIRROR` | unset | A mirror for the pinned downloads in Settings, Packages |

A model backend other than Ollama is chosen in **Settings, Models**, not here.

## Updating

Nothing about updating touches the network until you say so.

- **The installed app** is a snapshot. Turn on **Settings, About, Updates,
  Check GitHub for a newer version** (off by default, like web search) and the
  app tells you when a newer release exists. The **Check for updates** button
  checks once even with the switch off. On a packaged Windows install, the
  **Update automatically** button runs the official installer for you, and a
  second switch, **Update automatically when a new version is found**, does it
  without asking each time. With both off, nothing is downloaded or installed:
  fetch a newer installer and run it over the old one.
- **A launcher copy** asks once, the first time it starts, whether to check for
  updates each time it launches. Answer yes and it pulls the latest code from
  GitHub, then reinstalls dependencies when `requirements.txt` changes. Answer
  no and it runs what is here. Settings, About, Updates can change the answer
  and choose between finished releases and the newest changes. `--no-update`
  skips the step for one launch.

Schema upgrades happen on their own at startup: new columns are added in
place, and your notes are not touched. You never need to delete
`memorymap.db` to update.

## Uninstalling

**The Windows installer:** Windows Settings, Apps, MemoryMap AI, Uninstall. That
removes the program and its Start Menu entries and leaves your notes and
settings in `%APPDATA%\MemoryMap AI`. It then asks whether to delete the
optional packages you downloaded (the `python-extras` folder, which can be
large); a silent uninstall keeps them. To take your notes with you first, use
Settings, Import & export.

**A source checkout:** run `./uninstall.sh` (or `uninstall.bat`). It removes the
virtual environment the launcher built and its caches, and leaves your notes
alone unless you pass `--delete-data`. Start with `--dry-run`: it lists
everything that would go, with a size against each, and changes nothing.

| Flag | What it does |
| --- | --- |
| `--dry-run` | List what would be removed, with sizes, and change nothing |
| `--export PATH` | Write your notes to PATH as a Markdown zip first |
| `--delete-data` | Also delete your notes and `.env`, asked for separately |
| `--shortcuts` | Also remove the desktop shortcut `--shortcut` created |
| `--yes` | Skip the "remove the virtual environment?" prompts |
| `--help` | Show the list and exit |

It stops rather than delete under a MemoryMap that is still running, so close
the app first. `--delete-data` asks you to type DELETE at its own prompt,
which `--yes` does not skip.

`--export` writes the same Markdown zip as Settings, Import & export: one `.md`
file per note, with its metadata in the frontmatter. For a copy you can restore
into the app, use Settings, Import & export, Export full backup instead.

The optional packages can be installed, reinstalled or removed one at a time,
without a terminal, from **Settings, Packages**.
