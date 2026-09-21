#!/usr/bin/env bash
# A real model in the sandbox, for a developer, by hand (WORLD_CLASS_PLAN 9).
#
#   scratchpad/llama-dev.sh check          # what is here, what is missing
#   scratchpad/llama-dev.sh fetch          # download the GGUF (the only
#                                          # command that ever downloads)
#   scratchpad/llama-dev.sh build          # compile llama-server from a
#                                          # checkout you point LLAMA_CPP_SRC at
#   scratchpad/llama-dev.sh serve [port]   # start llama-server and print the
#                                          # two exports the evals read
#   scratchpad/llama-dev.sh env [port]     # print those exports again
#   scratchpad/llama-dev.sh stop [port]    # stop the server this script started
#
# Why this exists. CLAUDE.md section 4: every provider test in this project
# runs against a fake transport, so "how a real small model answers a
# re-prompt" is the one claim the suite cannot make. This script lifts that
# for whoever runs it, and for nobody else:
#
#   * Nothing in tests/ imports this file or shells out to it. The seam is two
#     environment variables, MEMORYMAP_EVALS_URL and MEMORYMAP_EVALS_MODEL,
#     which `serve` and `env` print and the evals read at collection time. A
#     shell that never ran this script collects zero evals, and the suite
#     stays green and honest.
#   * scripts/gate.sh does not call it in any mode, including --full.
#   * `check`, and running it with no arguments, fetch nothing. Only `fetch`
#     touches the network, and `serve` calls `fetch` only when the model is
#     genuinely absent.
#
# Nothing it produces goes in the repository. A GGUF is about a gigabyte, and
# a gigabyte in a clone breaks the clone, CI and the licence notices alike
# (WORLD_CLASS_PLAN 9 says exactly this). Everything lands in LLAMA_DEV_DIR,
# outside the tree.
#
# Knobs, all optional:
#   LLAMA_SERVER    path to a llama-server binary you already have
#   LLAMA_CPP_SRC   a llama.cpp checkout; its build/bin/llama-server is used,
#                   and `build` compiles it there
#   LLAMA_MODEL     path to a GGUF you already have, instead of the default
#   LLAMA_DEV_DIR   where the model and the logs live (default below)
#   LLAMA_DEV_PORT  default 8080, the port llama.cpp itself uses
set -euo pipefail

DEV_DIR="${LLAMA_DEV_DIR:-${TMPDIR:-/tmp}/memorymap-llama}"
PORT="${2:-${LLAMA_DEV_PORT:-8080}}"
# Qwen2.5-1.5B-Instruct Q4_K_M: the plan's own first choice, about 1.1 GB, and
# an instruct model that emits OpenAI tool calls under llama-server's --jinja,
# which is most of what this app asks a model to do.
MODEL_REPO="Qwen/Qwen2.5-1.5B-Instruct-GGUF"
MODEL_FILE="qwen2.5-1.5b-instruct-q4_k_m.gguf"
MODEL_URL="https://huggingface.co/${MODEL_REPO}/resolve/main/${MODEL_FILE}"

say() { printf '%s\n' "$*"; }
die() { printf '%s\n' "$*" >&2; exit 1; }

# A wrong override is its own error, and it is checked here rather than inside
# `find_server` below. `find_server` is only ever called in a command
# substitution, and a `die` inside one of those exits the subshell: the message
# reached the terminal but the script carried on and then reported the far less
# useful "llama-server: missing" about a path the developer had just named.
validate_overrides() {
  if [ -n "${LLAMA_SERVER:-}" ] && [ ! -x "$LLAMA_SERVER" ]; then
    die "LLAMA_SERVER is set to '$LLAMA_SERVER', which is not an executable file. Point it at a llama-server binary, or unset it and let this script look on PATH."
  fi
  if [ -n "${LLAMA_MODEL:-}" ] && [ ! -f "$LLAMA_MODEL" ]; then
    die "LLAMA_MODEL is set to '$LLAMA_MODEL', which is not a file. Point it at a .gguf, or unset it and run 'scratchpad/llama-dev.sh fetch' for the default one."
  fi
}

# Where the binary is, or nothing. Looked at in the order a developer would:
# what they told us, what is on PATH, what a previous `build` left behind.
find_server() {
  if [ -n "${LLAMA_SERVER:-}" ]; then
    printf '%s\n' "$LLAMA_SERVER"; return 0
  fi
  if command -v llama-server > /dev/null 2>&1; then command -v llama-server; return 0; fi
  for candidate in "${LLAMA_CPP_SRC:-}/build/bin/llama-server" "$DEV_DIR/bin/llama-server"; do
    [ -x "$candidate" ] && { printf '%s\n' "$candidate"; return 0; }
  done
  return 1
}

find_model() {
  if [ -n "${LLAMA_MODEL:-}" ]; then
    printf '%s\n' "$LLAMA_MODEL"; return 0
  fi
  [ -f "$DEV_DIR/$MODEL_FILE" ] && { printf '%s\n' "$DEV_DIR/$MODEL_FILE"; return 0; }
  return 1
}

# The missing-binary sentence, written the way src/memorymap/ai/offline.py
# writes its own: say what is true, then name the way out, and never claim
# more certainty than a path lookup earns.
no_server_message() {
  cat >&2 <<'MSG'
No llama-server found, so there is nothing to run a model with.

Three ways out, cheapest first:
  * You have one already: LLAMA_SERVER=/path/to/llama-server scratchpad/llama-dev.sh serve
  * You have a llama.cpp checkout: LLAMA_CPP_SRC=/path/to/llama.cpp scratchpad/llama-dev.sh build
  * You have neither: take a release build from llama.cpp's own downloads, or
    clone it and run the build command above. This script will not download a
    binary for you; a compiler toolchain and a release archive are choices a
    developer should make with their eyes open.

Everything else in this project works without it. The suite never needs it.
MSG
}

no_model_message() {
  cat >&2 <<MSG
No model file found, so llama-server has nothing to load.

  * You have a GGUF already: LLAMA_MODEL=/path/to/model.gguf scratchpad/llama-dev.sh serve
  * You do not: scratchpad/llama-dev.sh fetch
    downloads ${MODEL_FILE} (about 1.1 GB) from
    ${MODEL_REPO} into ${DEV_DIR}. Nothing is written inside the repository.
MSG
}

cmd_check() {
  local server="" model="" ready=0
  if server="$(find_server)"; then say "llama-server: $server"; else say "llama-server: missing"; ready=1; fi
  if model="$(find_model)"; then say "model:        $model"; else say "model:        missing"; ready=1; fi
  say "dev dir:      $DEV_DIR"
  say "port:         $PORT"
  if probe_ready; then
    say "server:       answering on http://127.0.0.1:$PORT/v1"
  else
    say "server:       not answering on http://127.0.0.1:$PORT (start it with 'serve')"
  fi
  if [ "$ready" != 0 ]; then
    say ""
    [ -n "$server" ] || no_server_message
    [ -n "$model" ] || no_model_message
    return 1
  fi
  say ""
  say "Ready. Next: scratchpad/llama-dev.sh serve $PORT"
}

cmd_fetch() {
  command -v curl > /dev/null 2>&1 || die "curl is not installed, and this script downloads with curl. Install curl, or download ${MODEL_URL} by hand and point LLAMA_MODEL at it."
  if find_model > /dev/null 2>&1; then say "already here: $(find_model)"; return 0; fi
  mkdir -p "$DEV_DIR"
  say "fetching $MODEL_FILE (about 1.1 GB) into $DEV_DIR"
  # A partial file under its final name is the trap here: a download cut off
  # half way leaves something that looks like a model and loads as a corrupt
  # one, and the error llama.cpp gives for that names a tensor, not the
  # download. Write to .part, rename on success.
  if ! curl -L --fail --max-time 3600 -o "$DEV_DIR/$MODEL_FILE.part" "$MODEL_URL"; then
    rm -f "$DEV_DIR/$MODEL_FILE.part"
    die "the download failed. If this is a sandbox, its egress policy may refuse huggingface.co; fetch ${MODEL_FILE} elsewhere and point LLAMA_MODEL at it."
  fi
  mv "$DEV_DIR/$MODEL_FILE.part" "$DEV_DIR/$MODEL_FILE"
  say "done: $DEV_DIR/$MODEL_FILE"
}

cmd_build() {
  [ -n "${LLAMA_CPP_SRC:-}" ] || die "Set LLAMA_CPP_SRC to a llama.cpp checkout first: LLAMA_CPP_SRC=/path/to/llama.cpp scratchpad/llama-dev.sh build"
  [ -f "$LLAMA_CPP_SRC/CMakeLists.txt" ] || die "LLAMA_CPP_SRC='$LLAMA_CPP_SRC' has no CMakeLists.txt, so it is not a llama.cpp checkout."
  command -v cmake > /dev/null 2>&1 || die "cmake is not installed, and llama.cpp builds with it."
  # LLAMA_CURL=OFF because the app never asks llama.cpp to fetch anything: this
  # script owns the model file, and the missing curl development headers are
  # the usual reason a first build fails on a machine that has everything else.
  cmake -B "$LLAMA_CPP_SRC/build" -S "$LLAMA_CPP_SRC" \
    -DCMAKE_BUILD_TYPE=Release -DLLAMA_CURL=OFF \
    -DLLAMA_BUILD_TESTS=OFF -DLLAMA_BUILD_EXAMPLES=OFF
  cmake --build "$LLAMA_CPP_SRC/build" --target llama-server -j "$(nproc 2> /dev/null || echo 4)"
  say "built: $LLAMA_CPP_SRC/build/bin/llama-server"
}

# The model id llama-server reports, which is what the OpenAI-compatible body
# has to name. llama.cpp answers with the model's own path by default, so
# asking it beats guessing from the filename.
served_model() {
  curl -sS --max-time 5 "http://127.0.0.1:$PORT/v1/models" 2> /dev/null |
    "${PYTHON:-python3}" -c 'import json, sys
try:
    print(json.load(sys.stdin)["data"][0]["id"])
except Exception:
    pass' 2> /dev/null
}

# Ready means "it will answer a chat request", not "the socket is open".
# llama-server binds its port before the weights are loaded and answers
# /v1/models with a 503 and a "loading model" body in between, and curl without
# --fail exits 0 on that, so a probe that only looked at the exit code called a
# server ready that then had nothing to say about which model it served. Asking
# for the model id is the same round trip and cannot be fooled by it.
probe_ready() { [ -n "$(served_model || true)" ]; }

cmd_env() {
  local model
  # `|| true`: under `set -e` a failing command substitution takes the whole
  # script with it, so "nothing is serving" exited 7 silently instead of
  # printing the one sentence a developer needs here.
  model="$(served_model || true)"
  [ -n "$model" ] || die "nothing is answering on http://127.0.0.1:$PORT/v1. Start it with: scratchpad/llama-dev.sh serve $PORT"
  say "export MEMORYMAP_EVALS_URL=http://127.0.0.1:$PORT/v1"
  say "export MEMORYMAP_EVALS_MODEL=$model"
}

cmd_serve() {
  local server model
  server="$(find_server)" || { no_server_message; exit 1; }
  if ! model="$(find_model)"; then
    say "no model yet, fetching one"
    cmd_fetch
    model="$(find_model)" || { no_model_message; exit 1; }
  fi
  if probe_ready; then
    say "something already answers on :$PORT, using it"
    cmd_env; return 0
  fi
  mkdir -p "$DEV_DIR"
  # setsid, not a plain background job: CLAUDE.md section 5, a later
  # `pkill -f llama-server` otherwise takes the shell that started it.
  # --jinja turns the model's own chat template on, and without it
  # llama-server will not emit OpenAI tool calls at all.
  setsid "$server" -m "$model" --host 127.0.0.1 --port "$PORT" \
    -c 8192 --jinja > "$DEV_DIR/server-$PORT.log" 2>&1 < /dev/null &
  for _ in $(seq 1 120); do
    sleep 1
    if probe_ready; then
      say "serving $model on http://127.0.0.1:$PORT/v1 (log $DEV_DIR/server-$PORT.log)"
      say ""
      cmd_env
      say ""
      say "Then, from the repository root:"
      say "  .venv/bin/python -m pytest -m evals tests/"
      return 0
    fi
  done
  die "llama-server did not answer within two minutes. Its log is $DEV_DIR/server-$PORT.log; a cold load of a large model on CPU can genuinely take longer, in which case raise the wait or use a smaller quant."
}

cmd_stop() {
  # Matched on the port, so a developer running two models loses only the one
  # they asked to stop.
  if pkill -f "llama-server.*--port $PORT" 2> /dev/null; then
    say "stopped whatever served :$PORT"
  else
    say "nothing to stop on :$PORT"
  fi
}

validate_overrides
case "${1:-check}" in
  check) cmd_check ;;
  fetch) cmd_fetch ;;
  build) cmd_build ;;
  serve) cmd_serve ;;
  env)   cmd_env ;;
  stop)  cmd_stop ;;
  *) die "usage: scratchpad/llama-dev.sh [check|fetch|build|serve|env|stop] [port]" ;;
esac
