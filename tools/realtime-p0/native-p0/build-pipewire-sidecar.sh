#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/artifacts"
mkdir -p "$OUT"
python3 "$HERE/generate-browser-assets.py" >/dev/null
if ! command -v pkg-config >/dev/null 2>&1 || ! pkg-config --exists libpipewire-0.3; then
  printf '{"status":"BLOCKED","reason":"pipewire-development-toolchain-unavailable"}\n' > "$OUT/P0N_SIDECAR_BUILD_GATE.json"
  exit 2
fi
CC_BIN="${CC:-cc}"
read -r -a PW_CFLAGS <<< "$(pkg-config --cflags libpipewire-0.3)"
read -r -a PW_LIBS <<< "$(pkg-config --libs libpipewire-0.3)"
if ! "$CC_BIN" -O3 -fno-builtin -std=c11 -Wall -Wextra -Werror -pthread -DP0N_HAVE_PIPEWIRE \
  "${PW_CFLAGS[@]}" "$HERE/src/p0_native_host.c" "$HERE/src/p0_native_null_driver.c" "$HERE/src/p0_native_pipewire_driver.c" \
  -lm "${PW_LIBS[@]}" -o "$OUT/p0_native_pipewire_sidecar" > "$OUT/P0N_SIDECAR_BUILD_LOG.txt" 2>&1; then
  printf '{"status":"FAIL","reason":"pipewire-sidecar-build-failed"}\n' > "$OUT/P0N_SIDECAR_BUILD_GATE.json"
  cat "$OUT/P0N_SIDECAR_BUILD_LOG.txt" >&2
  exit 12
fi
printf '{"status":"PASS","reason":"pipewire-sidecar-build-clean","binary":"%s"}\n' "$OUT/p0_native_pipewire_sidecar" > "$OUT/P0N_SIDECAR_BUILD_GATE.json"
printf 'built %s\n' "$OUT/p0_native_pipewire_sidecar"
