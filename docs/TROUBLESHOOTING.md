# Troubleshooting

- [The app will not start](#the-app-will-not-start)
- [The port is already in use](#the-port-is-already-in-use)
- [The first launch is slow or downloads something](#the-first-launch-is-slow-or-downloads-something)
- [Windows: "torch_xpu.dll ... WinError 127" and search falls back to keywords](#windows-torch_xpudll--winerror-127-and-search-falls-back-to-keywords)
- [Linux: the packaged app has no window](#linux-the-packaged-app-has-no-window)
- [The AI status says the AI is off](#the-ai-status-says-the-ai-is-off)
- [Web search returns nothing, or says DuckDuckGo is rate-limiting](#web-search-returns-nothing-or-says-duckduckgo-is-rate-limiting)
- [SearXNG will not start, or starts and never answers](#searxng-will-not-start-or-starts-and-never-answers)
- [I forgot my password](#i-forgot-my-password)
- [Something looks wrong and I want to see what happened](#something-looks-wrong-and-i-want-to-see-what-happened)

## The app will not start

**Started from a source checkout?** Run the launcher with `--doctor`
(`./start.sh --doctor` or `start.bat --doctor`). It prints one row per thing that
can stop a launch, with a tick or a cross and a one-line fix for each cross:
Python's version, whether the virtual environment can import what the server
needs, free disk, whether the port is free, your model provider, and the last
error from the previous run's log. If the environment looks broken, `--reinstall`
rebuilds it from scratch. `--logs` opens the folder of launcher logs, which hold
the last ten runs.

**Installed with the Windows installer?** Use the **Repair MemoryMap AI**
shortcut in the Start Menu. It clears the window's cached profile and starts the
app again, and never touches your notes or settings. A startup error is written
to `desktop-stdio.log` in the `logs` folder inside your data folder
(`%APPDATA%\MemoryMap AI`).

**Windows blocked the installer?** The blue "Windows protected your PC" screen is
expected, because the build is not code-signed yet. Click **More info**, then
**Run anyway**.

## The port is already in use

MemoryMap serves on port 8000. If something else has it, `--doctor` says so, and
`--port N` starts the app on another one (`./start.sh --port 8010`). For the
packaged apps and `python -m memorymap`, set `MEMORYMAP_PORT` instead. An
already-running MemoryMap on that port is not an error: open it, and use Settings,
Background tasks, Quit MemoryMap if you want it closed.

## The first launch is slow or downloads something

Search and filing by meaning use a built-in model that needs the
`sentence-transformers` package. The first time it is needed, and it is not
installed, the app installs it by itself: a one-time download of several hundred
MB (more on Windows, where it brings torch) that needs the internet and can take
several minutes. Settings, Search and index, Search engine says when it is
running, and Settings, Background tasks lists the job. Search falls back to
keywords until it finishes, and nothing else waits for it.

To avoid the download, pick an Ollama embedding model (`nomic-embed-text`) in the
same place, or set `MEMORYMAP_NO_AUTO_INSTALL` to stop the automatic install.

## Windows: "torch_xpu.dll ... WinError 127" and search falls back to keywords

You see a banner like *"The specified procedure could not be found. Error loading
...\torch\lib\torch_xpu.dll"*. The app is fine. torch's default Windows wheel
ships an Intel GPU library that cannot load on your machine, and MemoryMap needs
only the **CPU** build.

**Fresh installs are already handled.** `requirements.txt` installs the CPU-only
torch on Windows.

**Already installed the broken wheel?** Swap it, from the project folder's
virtual environment:

```
pip uninstall -y torch
pip install torch --index-url https://download.pytorch.org/whl/cpu
```

Then restart the app. In the packaged app, Settings, Packages has a reinstall
for Search by meaning (sentence-transformers) that does the same job without a
terminal.

**Or go torch-free.** In **Settings, Models**, download `nomic-embed-text`, then
pick it under Ollama embedding model in **Settings, Search and index**. It runs
entirely through Ollama, needs no torch, and your notes re-index automatically.

## Linux: the packaged app has no window

The window needs GTK and WebKit as system packages. On Debian and Ubuntu:

```
sudo apt install python3-gi python3-gi-cairo gir1.2-gtk-3.0 gir1.2-webkit2-4.1
```

Check that you unpacked the `.tar.gz` and not the `.zip`: a zip may drop the
executable bit, which leaves a launcher that will not start and says nothing.

## The AI status says the AI is off

The AI status sits in the status bar at the foot of the window, and "AI off" is
amber, not red. It is a supported state: the app is built to degrade. Capture and
full-text search work exactly as normal, and only auto-filing and chat answers
need a model. Red is reserved for a model that failed to load or a server that
cannot be reached, which is rarer, because it needs the server to be reachable but
failing rather than simply not running.

Start Ollama, or your OpenAI-compatible server, and check Settings, Models,
Model backend. If you use LM Studio, llama.cpp or vLLM, the address must end in
`/v1` and match the server's port: [MODELS.md](MODELS.md) lists them.

## Web search returns nothing, or says DuckDuckGo is rate-limiting

Web search must be on first: **Settings, Web search**. Scraping DuckDuckGo gets
rate-limited, and the app says so rather than showing an empty panel. Waiting a
few minutes usually clears it.

The real fix is your own SearXNG instance: **Settings, Web search, Start
SearXNG**. MemoryMap installs it (in a container if you have Docker, otherwise
in a virtual environment of its own), configures the JSON API, and points search
at it.

## SearXNG will not start, or starts and never answers

Everything you need is in **Settings, Web search**:

- **The port line** says whether port 8888 is free, held by a working SearXNG
  (fine, MemoryMap will use it), or held by something else, which is the only
  case you have to fix. `MEMORYMAP_SEARXNG_PORT` picks another port.
- **What SearXNG reported** is a fold with the instance's own output: the actual
  traceback, not a guess. It is kept in `searxng/searxng.log` in your data folder
  too.
- **Reinstall** deletes the downloaded copy and its virtual environment and
  builds a fresh one. This is the fix when an install was interrupted, or the
  Python it was built against has since been upgraded: it looks installed and
  dies on start. Your `settings.yml` is kept, because it holds the instance's
  secret key and any edits you made, and it is not what breaks.

## I forgot my password

There is no reset link inside the app, on purpose. Run
`python -m memorymap --reset-password` in a terminal. Ordinary notes come back
untouched; **private notes are lost**, because their key comes from the password,
and the command tells you how many you have before you confirm. The reset also
turns off "Allow other devices on this network". More in
[PRIVACY.md](PRIVACY.md#if-you-forget-the-password).

## Something looks wrong and I want to see what happened

**Settings, Logs** is a live view of what the app is doing, with no terminal to
hunt for. It streams as things happen, follows the newest records (and pauses the
moment you scroll up to read one), filters by text, level and which log, and
folds tracebacks open under the record they belong to. Server and browser logs
sit in one time-ordered list, so an error in the page and the request behind it
are side by side. The live view is held in memory and not written to disk, and it
says so when the buffer has had to drop older records rather than leaving a
silent gap. The launcher's own logs are the exception: they are files, described
under [The app will not start](#the-app-will-not-start).

**Got an error you want to send someone?** Every record has its own copy button
that takes the traceback with it, and an opened traceback has a **Copy
traceback** button too, so one error is one click. **Copy all** copies what is on
screen and relabels itself ("Copy 12 shown") whenever a filter is hiding
something.

**Reporting a bug?** The **Support bundle** button on the same screen saves a zip
with the log, your settings, and app and model status, which is what a bug report
needs. Nothing is sent anywhere: the file goes to your disk and sharing it is your
choice. Free-text settings are listed by name and length only (your display name
appears as `str, 31 chars`), a user name and password typed into the model server
address are left out, and no note, document, chat or reminder content is
included. A README inside the zip says exactly what it holds.

**Odd behaviour after an update?** Settings, Import & export, App cache, Clear app
cache reloads the app with fresh files. Nothing in your notebook is touched.
