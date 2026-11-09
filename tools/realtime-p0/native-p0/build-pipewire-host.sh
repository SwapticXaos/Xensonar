#!/usr/bin/env bash
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/artifacts"
mkdir -p "$OUT"
PROBE="$OUT/P0N_PIPEWIRE_TOOLCHAIN.json"
GATE="$OUT/P0N_PIPEWIRE_BUILD_GATE.json"
LOG="$OUT/P0N_PIPEWIRE_BUILD_LOG.txt"
"$HERE/probe-pipewire-toolchain.sh" > "$PROBE"
write_gate() {
  local status="$1" reason="$2" pkg="$3"
  printf '{"status":"%s","reason":"%s","compiler":"%s","pipewirePkgVersion":"%s","warningsEnabled":true,"strictApiWarnings":true,"binary":"%s"}\n' \
    "$status" "$reason" "${CC:-cc}" "$pkg" "$OUT/p0_native_pipewire_host" > "$GATE"
}
if ! command -v pkg-config >/dev/null 2>&1 || ! pkg-config --exists libpipewire-0.3; then
  write_gate BLOCKED pipewire-development-toolchain-unavailable ""
  printf 'BLOCKED: libpipewire-0.3 development headers/pkg-config metadata are required. Runtime-only PipeWire is not a compile proof.\n' >&2
  exit 2
fi
CC_BIN="${CC:-cc}"
PKG_VERSION="$(pkg-config --modversion libpipewire-0.3 2>/dev/null || true)"
read -r -a PW_CFLAGS <<< "$(pkg-config --cflags libpipewire-0.3)"
read -r -a PW_LIBS <<< "$(pkg-config --libs libpipewire-0.3)"
if ! "$CC_BIN" -O3 -fno-builtin -std=c11 -Wall -Wextra \
  -Werror=implicit-function-declaration -Werror=incompatible-pointer-types -Werror=return-type \
  -pthread -DP0N_HAVE_PIPEWIRE "${PW_CFLAGS[@]}" \
  "$HERE/src/p0_native_host.c" "$HERE/src/p0_native_null_driver.c" "$HERE/src/p0_native_pipewire_driver.c" \
  -lm "${PW_LIBS[@]}" -o "$OUT/p0_native_pipewire_host" >"$LOG" 2>&1; then
  write_gate FAIL pipewire-host-build-failed "$PKG_VERSION"
  cat "$LOG" >&2
  exit 12
fi
write_gate PASS pipewire-host-build-clean "$PKG_VERSION"
printf 'built %s\n' "$OUT/p0_native_pipewire_host"
