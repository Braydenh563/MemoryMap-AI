#!/usr/bin/env bash
# ====================================================================
#  MemoryMap AI - one-click launcher for macOS / Linux
#
#  Run ./start.sh - it sets everything up the first time, then just runs
#  the app after that:
#
#    1. use the app's own .venv Python (only needs a system Python the
#       very first time, to build that .venv)
#    2. install / update dependencies + the app itself
#    3. copy .env.example to .env the first time
#    4. start the server and open your browser at localhost:8000
# ====================================================================
set -e
# The pip install below is piped through `tee` so its own progress prints
# live instead of vanishing into a log file until either done or failed —
# reported directly ("I hate that I can't see what's going on and why it
# is taking so long"). Without `pipefail`, `cmd | tee file` reports tee's
# exit status (always 0), not the command's, which would silently turn
# every pip failure into a false success.
set -o pipefail
cd "$(dirname "$0")"

# --- Launch splash ---------------------------------------------------
# The same gap start.bat's splash covers: the git pull, building .venv and a
# pip install all happen before Python exists, so before __main__.py can show
# its own loading window. Reported as the app appearing not to start at all.
#
# Gated on `[ ! -t 1 ]` — stdout not being a terminal — which is exactly the
# case the report is about: launched from a file manager or a .desktop entry,
# with no console to read. Run from a terminal this script already narrates
# every phase, and a second window over the top would be noise.
#
# zenity only. kdialog's progress dialog needs DBus plumbing to update, and
# macOS ships no equivalent that is not a modal stealing focus — a splash is
# not worth either. Where it is missing nothing happens, exactly as before.
MM_SPLASH_PID=""
MM_SPLASH_FIFO=""
if [ ! -t 1 ] && command -v zenity >/dev/null 2>&1; then
  MM_SPLASH_FIFO="$(mktemp -u "${TMPDIR:-/tmp}/mm_splash_XXXXXX")"
  if mkfifo "$MM_SPLASH_FIFO" 2>/dev/null; then
    zenity --progress --pulsate --no-cancel --auto-close \
           --title="MemoryMap AI" --text="Starting…" \
           < "$MM_SPLASH_FIFO" >/dev/null 2>&1 &
    MM_SPLASH_PID=$!
    # Held open on fd 9 for the life of the script: closing it is what tells
    # zenity the job is over, so it must not close between phases.
    exec 9>"$MM_SPLASH_FIFO"
  else
    MM_SPLASH_FIFO=""
  fi
fi

# One line of text into the dialog. zenity reads "#text" as a label update.
mm_splash() {
  [ -n "$MM_SPLASH_PID" ] || return 0
  printf '#%s\n' "$1" >&9 2>/dev/null || true
}

# Must run on every exit — a pulsating dialog left with no owner is worse than
# no dialog. Note this does NOT cover the `exec`s at the end of this script:
# exec replaces the shell without firing EXIT, and fd 9 is inherited by the
# new process, which would hold the fifo open and leave zenity on screen for
# the entire life of the app. Both of those call mm_splash_done by hand.
mm_splash_done() {
  [ -n "$MM_SPLASH_PID" ] || return 0
  exec 9>&- 2>/dev/null || true
  kill "$MM_SPLASH_PID" 2>/dev/null || true
  [ -n "$MM_SPLASH_FIFO" ] && rm -f "$MM_SPLASH_FIFO" 2>/dev/null
  MM_SPLASH_PID=""
}
trap mm_splash_done EXIT INT TERM

# --- Help ------------------------------------------------------------
# Checked before anything else touches the network or the venv, so
# `--help` is always instant regardless of connection state.
for arg in "$@"; do
  case "$arg" in
    -h|--help)
      cat <<'MM_HELP'
MemoryMap AI launcher

Usage:
  ./start.sh              Start the app at http://localhost:8000
  ./start.sh --desktop    Start the app in its own window instead of a browser tab
  ./start.sh --help       Show this message and exit

What it does: builds .venv on first run, installs/updates dependencies
whenever requirements.txt changes, pulls the latest code first (skipped
silently if offline), then starts the server.

To remove what this script installed, see ./uninstall.sh --help.
MM_HELP
      exit 0
      ;;
  esac
done

# --- Desktop mode ---------------------------------------------------
# "./start.sh --desktop" runs the app in its own window instead of a
# browser tab. Exported so it survives the self-update re-exec below.
for arg in "$@"; do
  case "$arg" in
    --desktop|desktop) export MM_DESKTOP=1 ;;
  esac
done

# --- Network helpers --------------------------------------------------
# Every network call in this script (the self-update `git pull` below, and
# pip in step 2) goes through these two so "no internet" behaves the same
# way everywhere: a short, bounded wait, a one-line explanation, and the
# launch continues. Nothing here may ever be allowed to hang - a DNS lookup
# that never returns or a proxy that accepts the connection and then says
# nothing both stall past any timeout a well-behaved server would need,
# which is exactly why a hard wall-clock timeout (not just pip's own
# `--timeout`, which only bounds a single socket read) wraps every call.
#
# `timeout`/`gtimeout` (GNU coreutils) cover Linux and a Homebrew-equipped
# Mac; the manual fallback below covers a stock macOS with neither, using a
# background watcher that SIGTERMs the job if it outlives its budget.
run_with_timeout() {
  local secs="$1"; shift
  if command -v timeout >/dev/null 2>&1; then
    timeout "$secs" "$@"
    return $?
  fi
  if command -v gtimeout >/dev/null 2>&1; then
    gtimeout "$secs" "$@"
    return $?
  fi
  "$@" &
  local cmd_pid=$!
  ( sleep "$secs" 2>/dev/null; kill -TERM "$cmd_pid" 2>/dev/null ) &
  local watcher_pid=$!
  local status=0
  wait "$cmd_pid" 2>/dev/null || status=$?
  kill "$watcher_pid" 2>/dev/null || true
  wait "$watcher_pid" 2>/dev/null || true
  return "$status"
}

# Recognises the shapes "no internet" actually takes on the command line -
# DNS failure, connection refused/timed out, a proxy that errors or hangs,
# TLS failing to negotiate - so those get a calm one-liner instead of a wall
# of the tool's own retry/traceback text. Anything that does NOT match this
# (a real dependency conflict, a corrupt requirements.txt, disk full) falls
# through to printing the tool's actual error, on purpose - CLAUDE.md is
# explicit that swallowing a genuine failure behind "offline?" costs the
# next session an hour finding out it wasn't.
is_network_error() {
  grep -qiE \
    'could not resolve host|temporary failure in name resolution|name or service not known|nodename nor servname|node name.*not known|connection timed out|connection refused|network is unreachable|failed to establish a new connection|read timed out|newconnectionerror|max retries exceeded|no route to host|could not connect to server|couldn.t connect to server|ssl.*(handshake|certificate)|proxy (error|authentication)|getaddrinfo failed|unable to connect|connection reset by peer|no address associated with hostname|could not fetch url|unreachable network|operation too slow|bytes/sec transferred|unable to access|could not resolve proxy|empty reply from server|timed out waiting' \
    "$1" 2>/dev/null
}

# --- 0. Self-update, then re-exec a fresh copy ----------------------
# Pull first so a launch always runs the latest code, then re-exec the
# (possibly updated) script so a changed file can't corrupt this run.
# The MM_CHILD guard prevents an endless loop.
if [ -z "${MM_CHILD:-}" ] && command -v git >/dev/null 2>&1 && [ -d .git ]; then
  mm_splash "Checking for updates on GitHub..."
  echo " Checking for updates..."
  GIT_LOG="$(mktemp 2>/dev/null || echo "/tmp/mm_git_$$.log")"
  # Read before the pull so a real version change can be reported to the
  # app after relaunch (below) — the whole point of this script's own
  # update mechanism being invisible otherwise: it runs and finishes
  # before the server (and the browser tab) even exist, so nothing else
  # in the app can tell "was I just updated?" without this.
  MM_VERSION_BEFORE="$(sed -n 's/__version__ = "\(.*\)"/\1/p' src/memorymap/__init__.py 2>/dev/null | head -1)"
  # `http.lowSpeedLimit`/`http.lowSpeedTime` abort a connection that has
  # gone quiet mid-transfer (a proxy that stalls after accepting bytes);
  # `run_with_timeout` is the hard wall-clock backstop for a connect phase
  # that never gets that far - a DNS query or a proxy handshake that hangs
  # before a single byte comes back, which the low-speed options don't see.
  if run_with_timeout 8 git -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=5 \
       pull --ff-only >"$GIT_LOG" 2>&1; then
    # git's own progress line ("Already up to date." / "Fast-forward...") is
    # genuinely useful - captured above only so a *failure* can be
    # classified, not to hide it on the success path.
    cat "$GIT_LOG"
    MM_VERSION_AFTER="$(sed -n 's/__version__ = "\(.*\)"/\1/p' src/memorymap/__init__.py 2>/dev/null | head -1)"
    if [ -n "$MM_VERSION_AFTER" ] && [ "$MM_VERSION_BEFORE" != "$MM_VERSION_AFTER" ]; then
      # Picked up by routes_update.py's GET /update/source-status, purely
      # from these two env vars — no network call needed on the app's own
      # side, so this stays offline-safe the same way everything else that
      # touches "was there an update" in this app is required to be.
      export MM_UPDATED_FROM="$MM_VERSION_BEFORE"
      export MM_UPDATED_TO="$MM_VERSION_AFTER"
    fi
  else
    if is_network_error "$GIT_LOG"; then
      echo "        No internet - skipping update check."
    else
      echo "        (skipped update - staying on the current version)"
      tail -n 5 "$GIT_LOG" | sed 's/^/        /'
    fi
  fi
  rm -f "$GIT_LOG" 2>/dev/null || true
  export MM_CHILD=1
  exec "$0" "$@"
fi

# Colour, only when talking to a real terminal - a redirected/piped run
# (a log file, a CI step) should never end up with raw escape codes in it.
if [ -t 1 ]; then
  TEAL=$'\033[1;38;5;73m'
  RED=$'\033[1;31m'
  YELLOW=$'\033[1;33m'
  RESET=$'\033[0m'
else
  TEAL="" ; RED="" ; YELLOW="" ; RESET=""
fi

echo
printf '%s' "$TEAL"
cat <<'MM_LOGO'
    __  ___                                __  ___               ___    ____
   /  |/  /___  ____ ___  ____  _______  __/  |/  /___ _____    /   |  / _/
  / /|_/ / _ \/ __ `__ \/ __ \/ ___/ / / / /|_/ / __ `/ __ \  / /| |  / /
 / /  / /  __/ / / / / / /_/ / /  / /_/ / /  / / /_/ / /_/ / / ___ |_/ /
/_/  /_/\___/_/ /_/ /_/\____/_/   \__, /_/  /_/\__,_/ .___/ /_/  |_/___/
                                 /____/            /_/
MM_LOGO
printf '            your notebook, on your machine%s\n\n' "$RESET"

VENV_PY=".venv/bin/python"

# --- 1. Build the venv if it doesn't exist yet ----------------------
# Only the first run needs a system Python; later launches use .venv.
if [ ! -x "$VENV_PY" ]; then
  echo " ${TEAL}[1/4]${RESET} First-time setup - looking for Python to build the environment..."
  PYTHON=""
  if command -v python3 >/dev/null 2>&1; then PYTHON=python3
  elif command -v python >/dev/null 2>&1; then PYTHON=python
  fi
  if [ -z "$PYTHON" ]; then
    echo " ${RED}[X]${RESET} No Python found. Install Python 3.11+ and run this again."
    exit 1
  fi
  # Caught here, not left to surface later as a confusing pip/import
  # failure deep into step 2 - `pyproject.toml` requires 3.11+, and
  # building a venv with an older interpreter would "succeed" and only
  # fail once something actually needs a 3.11-only feature.
  if ! "$PYTHON" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)' 2>/dev/null; then
    echo " ${RED}[X]${RESET} Found $($PYTHON --version 2>&1), but MemoryMap AI needs Python 3.11 or newer."
    echo "        Install a newer Python and run this again."
    exit 1
  fi
  echo "        Using $($PYTHON --version) to create the virtual environment..."
  if ! "$PYTHON" -m venv .venv; then
    echo " ${RED}[X]${RESET} Could not create the virtual environment (see the error above)."
    echo "        On Debian/Ubuntu this is usually a missing package:"
    echo "        sudo apt install python3-venv"
    exit 1
  fi
else
  echo " ${TEAL}[1/4]${RESET} Using the app's virtual environment."
fi

if [ ! -x "$VENV_PY" ]; then
  echo " ${RED}[X]${RESET} The virtual environment looks incomplete - delete .venv and re-run."
  exit 1
fi

# --- 2. Install / update dependencies --------------------------------
NEED_INSTALL=1
if [ -f ".venv/.mm_installed" ]; then
  REQ_HASH=$(cksum requirements.txt | awk '{print $1}')
  LAST_HASH=$(cat ".venv/.mm_installed" 2>/dev/null || echo "")
  [ "$REQ_HASH" = "$LAST_HASH" ] && NEED_INSTALL=0
fi

if [ "$NEED_INSTALL" = "0" ] && ! "$VENV_PY" -c "import memorymap" >/dev/null 2>&1; then
  echo " ${TEAL}[2/4]${RESET} The app folder moved since it was installed - relinking it..."
  NEED_INSTALL=1
fi

if [ "$NEED_INSTALL" = "1" ]; then
  mm_splash "Installing dependencies - this can take a few minutes..."
  echo " ${TEAL}[2/4]${RESET} Installing dependencies - this can take a few minutes the first time."
  echo "        pip's own progress prints below as it happens:"
  # `--timeout 5 --retries 0` makes pip fail fast per-connection instead of
  # its default (a 15s socket timeout retried 5 times, which is several
  # minutes of silence on a dead network before the venv check even runs);
  # `run_with_timeout` is still the outer backstop for the one phase pip's
  # own flags don't bound - resolving the index host in the first place.
  #
  # Piped through `tee` rather than redirected: pip's own "Collecting X /
  # Downloading X / Installing collected packages" lines are real progress
  # information, and hiding them behind a static "installing..." message
  # with nothing moving for minutes is exactly what was reported. The log
  # file still gets a full copy for the network-vs-real-error check below,
  # `pipefail` (set at the top of this script) makes `$?` reflect pip's
  # exit status rather than tee's.
  PIP_LOG="$(mktemp 2>/dev/null || echo "/tmp/mm_pip_$$.log")"
  # Retries only a network-*shaped* failure, and only automatically - a real
  # one (bad requirements.txt, a wrong platform wheel, disk full) is retried
  # zero times on purpose. Looping the same failing command against a broken
  # requirements.txt would just waste the user's time and bandwidth instead
  # of saving it (ROADMAP Priority 0 #9); is_network_error is the same
  # classifier the (non-retrying) reporting below already trusted, not a new
  # one built for this. `tee "$PIP_LOG"` (no -a) on the first command of each
  # attempt already truncates the log fresh, so a retry's own is_network_error
  # check never sees the previous attempt's output.
  PIP_ATTEMPT=1
  PIP_MAX_ATTEMPTS=3
  PIP_DELAY=5
  while true; do
    if run_with_timeout 20 "$VENV_PY" -m pip install --upgrade pip --timeout 5 --retries 0 2>&1 | tee "$PIP_LOG" && \
       run_with_timeout 180 "$VENV_PY" -m pip install -r requirements.txt --timeout 5 --retries 0 2>&1 | tee -a "$PIP_LOG" && \
       run_with_timeout 60 "$VENV_PY" -m pip install -e . --timeout 5 --retries 0 2>&1 | tee -a "$PIP_LOG"; then
      cksum requirements.txt | awk '{print $1}' > ".venv/.mm_installed"
      break
    fi
    if [ "$PIP_ATTEMPT" -ge "$PIP_MAX_ATTEMPTS" ] || ! is_network_error "$PIP_LOG"; then
      if is_network_error "$PIP_LOG"; then
        echo " ${YELLOW}[!]${RESET} No internet - skipping dependency update."
      else
        # Not a network shape - show the real reason rather than guessing.
        # A silently-mislabelled dependency failure is the trap CLAUDE.md
        # calls out: it reads as "offline" and costs the next session an hour
        # finding out the real cause was a broken requirements.txt.
        echo " ${YELLOW}[!]${RESET} Could not update dependencies:"
        tail -n 8 "$PIP_LOG" | sed 's/^/        /'
      fi
      rm -f "$PIP_LOG" 2>/dev/null || true
      if "$VENV_PY" -c "import memorymap" >/dev/null 2>&1; then
        echo "        Launching with existing installation..."
      else
        echo " ${RED}[X]${RESET} First-time setup requires an internet connection to install dependencies."
        exit 1
      fi
      break
    fi
    echo " ${YELLOW}[!]${RESET} Looked like a network hiccup (attempt $PIP_ATTEMPT/$PIP_MAX_ATTEMPTS) - retrying in ${PIP_DELAY}s..."
    sleep "$PIP_DELAY"
    PIP_ATTEMPT=$((PIP_ATTEMPT + 1))
    PIP_DELAY=$((PIP_DELAY * 2))
  done
  rm -f "$PIP_LOG" 2>/dev/null || true
else
  echo " ${TEAL}[2/4]${RESET} Dependencies already up to date - skipping install."
fi

# pywebview is optional and only the app window needs it, so it installs
# on demand rather than for everyone. A failure is not fatal - the app
# falls back to a browser tab, and it needs the same timeout treatment as
# the rest of step 2: this can run even when NEED_INSTALL was 0, so it is
# the one bit of network work that isn't skipped just because the venv
# already has everything else.
if [ -n "${MM_DESKTOP:-}" ]; then
  echo "        Checking desktop window support..."
  if ! run_with_timeout 20 "$VENV_PY" -m pip install --quiet --timeout 5 --retries 0 pywebview; then
    echo " ${YELLOW}[!]${RESET} pywebview would not install (offline, or a real error) - opening a browser tab instead."
    unset MM_DESKTOP
  fi
fi

# --- 3. First-run .env ----------------------------------------------
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  cp ".env.example" ".env"
  echo " ${TEAL}[3/4]${RESET} Created .env from .env.example."
else
  echo " ${TEAL}[3/4]${RESET} Configuration found."
fi

# --- 4. Launch -------------------------------------------------------
if [ -n "${MM_DESKTOP:-}" ]; then
  echo " ${TEAL}[4/4]${RESET} Starting MemoryMap AI in its own window."
  echo "        Close the window to stop it."
  echo
  echo " ${TEAL}Installed at:${RESET} $(pwd)"
  echo " ${TEAL}Next time:${RESET}    open a terminal there and run ./start.sh --desktop again"
  echo
  mm_splash "Starting the app..."
  mm_splash_done
  exec "$VENV_PY" -m memorymap --desktop
fi

echo " ${TEAL}[4/4]${RESET} Starting MemoryMap AI at http://localhost:8000"
echo "        A browser tab opens in a moment. Press Ctrl+C to stop."
echo
# Asked for directly: "guide the user to where the application location is
# and what files to run" — a fresh install is easy to lose track of once the
# terminal window closes and there's no shortcut or icon involved. $(pwd) is
# safe here specifically because of the `cd "$(dirname "$0")"` at the top of
# this script — it is always this script's own folder, not wherever the
# terminal happened to be launched from.
echo " ${TEAL}Installed at:${RESET} $(pwd)"
echo " ${TEAL}Next time:${RESET}    open a terminal there and run ./start.sh again"
echo

(
  sleep 3
  if command -v open >/dev/null 2>&1; then open http://localhost:8000
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open http://localhost:8000
  fi
) >/dev/null 2>&1 &

mm_splash "Starting the app..."
mm_splash_done

exec "$VENV_PY" -m memorymap
