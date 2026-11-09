#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$HERE/src/p0_native_pipewire_driver.c"
PROBE="$HERE/probe-pipewire-toolchain.sh"

if grep -q 'pw_stream_return_buffer[[:space:]]*(' "$SRC"; then
  echo 'pipewire-1.0.5-compat-fail: pw_stream_return_buffer is unavailable in 1.0.5' >&2
  exit 1
fi
grep -q 'pw_stream_queue_buffer[[:space:]]*(' "$SRC"
grep -q 'position->clock.xrun' "$SRC"
if grep -q 'position->clock.flags' "$SRC"; then
  echo 'pipewire-1.0.5-compat-fail: xrun flag path must not be required' >&2
  exit 1
fi
grep -q 'pkg-config --cflags libpipewire-0.3' "$PROBE"
printf 'pipewire-1.0.5-compat-static-pass\n'
