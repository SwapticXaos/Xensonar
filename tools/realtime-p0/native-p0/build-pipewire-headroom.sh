#!/usr/bin/env bash
set -uo pipefail
export LC_ALL=C
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/artifacts"
mkdir -p "$OUT"
PROBE="$OUT/P0N_PIPEWIRE_TOOLCHAIN.json"
GATE="$OUT/P0N_PIPEWIRE_HEADROOM_BUILD_GATE.json"
LOG="$OUT/P0N_PIPEWIRE_HEADROOM_BUILD_LOG.txt"
"$HERE/probe-pipewire-toolchain.sh" > "$PROBE"
write_gate() {
  local status="$1" reason="$2" pkg="$3"
  printf '{"status":"%s","reason":"%s","compiler":"%s","pipewirePkgVersion":"%s","binary":"%s"}\n' \
    "$status" "$reason" "${CC:-cc}" "$pkg" "$OUT/p0_native_physical_headroom"
}
if ! command -v pkg-config >/dev/null 2>&1 || ! pkg-config --exists libpipewire-0.3; then
  write_gate BLOCKED pipewire-development-toolchain-unavailable "" > "$GATE"
  cat "$GATE"
  exit 2
fi
CC_BIN="${CC:-cc}"
PKG_VERSION="$(pkg-config --modversion libpipewire-0.3 2>/dev/null || true)"
read -r -a PW_CFLAGS <<< "$(pkg-config --cflags libpipewire-0.3)"
read -r -a PW_LIBS <<< "$(pkg-config --libs libpipewire-0.3)"
if ! "$CC_BIN" -O3 -fno-builtin -std=c11 -Wall -Wextra -Werror \
  -pthread -DP0N_HAVE_PIPEWIRE "${PW_CFLAGS[@]}" \
  "$HERE/src/p0_native_physical_headroom.c" "$HERE/src/p0_native_null_driver.c" "$HERE/src/p0_native_pipewire_driver.c" \
  -lm "${PW_LIBS[@]}" -o "$OUT/p0_native_physical_headroom" >"$LOG" 2>&1; then
  write_gate FAIL pipewire-headroom-build-failed "$PKG_VERSION" > "$GATE"
  cat "$LOG" >&2
  exit 12
fi
write_gate PASS pipewire-headroom-build-clean "$PKG_VERSION" > "$GATE"
printf 'built %s\n' "$OUT/p0_native_physical_headroom"
