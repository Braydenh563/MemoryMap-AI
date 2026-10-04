#!/usr/bin/env bash
# Stop the uvicorn serving a port. A file, not an inline loop: an inline
# loop's own shell has the pattern on its command line and kills itself.
for p in /proc/[0-9]*; do
  cmd=$(tr '\0' ' ' < "$p/cmdline" 2>/dev/null) || continue
  case "$cmd" in *uvicorn*"--port $1"*) kill "${p#/proc/}" 2>/dev/null;; esac
done
