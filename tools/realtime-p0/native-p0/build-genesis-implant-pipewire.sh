#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/artifacts"
K="$HERE/genesis-kernel"
mkdir -p "$OUT"
python3 "$HERE/generate-browser-assets.py" >/dev/null
if ! command -v pkg-config >/dev/null 2>&1 || ! pkg-config --exists libpipewire-0.3; then
  printf '{"status":"IMPLEMENTED_NOT_EXECUTED","reason":"pipewire-development-toolchain-unavailable"}\n' > "$OUT/GENESIS_IMPLANT_OP1_PIPEWIRE_BUILD.json"
  cat "$OUT/GENESIS_IMPLANT_OP1_PIPEWIRE_BUILD.json"
  exit 2
fi
CC_BIN="${CC:-cc}"
read -r -a PW_CFLAGS <<< "$(pkg-config --cflags libpipewire-0.3)"
read -r -a PW_LIBS <<< "$(pkg-config --libs libpipewire-0.3)"
KSRC=(
  "$K/src/core/xen_engine.c" "$K/src/core/xen_command.c" "$K/src/core/xen_voice.c"
  "$K/src/core/xen_asset.c" "$K/src/core/xen_recorder.c" "$K/src/dsp/xen_dsp.c"
  "$K/src/programs/xen_prog_granular.c" "$K/src/backends/xen_backend_null.c"
  "$K/src/backends/xen_backend_pipewire.c" "$K/src/adapters/xen_xensonar.c"
)
if ! "$CC_BIN" -O2 -ffp-contract=off -fno-fast-math -fno-builtin -D_GNU_SOURCE \
  -DP0N_GENESIS_IMPLANT -DP0N_HAVE_PIPEWIRE -std=c11 -Wall -Wextra -Werror -pthread \
  -I"$K/include" -I"$K/src" "${PW_CFLAGS[@]}" \
  "$HERE/src/p0_native_host.c" "$HERE/src/p0_native_null_driver.c" "$HERE/src/p0_native_pipewire_driver.c" \
  "${KSRC[@]}" -lm -lpthread "${PW_LIBS[@]}" -o "$OUT/p0_genesis_implant_pipewire_sidecar" \
  > "$OUT/GENESIS_IMPLANT_OP1_PIPEWIRE_BUILD.log" 2>&1; then
  printf '{"status":"FAILED","reason":"pipewire-build-failed"}\n' > "$OUT/GENESIS_IMPLANT_OP1_PIPEWIRE_BUILD.json"
  cat "$OUT/GENESIS_IMPLANT_OP1_PIPEWIRE_BUILD.log" >&2
  exit 12
fi
printf '{"status":"VERIFIED","physical":"NOT_EXECUTED","binary":"%s"}\n' "$OUT/p0_genesis_implant_pipewire_sidecar" > "$OUT/GENESIS_IMPLANT_OP1_PIPEWIRE_BUILD.json"
cat "$OUT/GENESIS_IMPLANT_OP1_PIPEWIRE_BUILD.json"
