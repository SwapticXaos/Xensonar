#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/artifacts"
K="$HERE/genesis-kernel"
mkdir -p "$OUT"
python3 "$HERE/generate-browser-assets.py" >/dev/null
KSRC=(
  "$K/src/core/xen_engine.c"
  "$K/src/core/xen_command.c"
  "$K/src/core/xen_voice.c"
  "$K/src/core/xen_asset.c"
  "$K/src/core/xen_recorder.c"
  "$K/src/dsp/xen_dsp.c"
  "$K/src/programs/xen_prog_granular.c"
  "$K/src/backends/xen_backend_null.c"
  "$K/src/backends/xen_backend_pipewire.c"
  "$K/src/adapters/xen_xensonar.c"
)
cc -O2 -ffp-contract=off -fno-fast-math -fno-builtin -D_GNU_SOURCE \
  -DP0N_GENESIS_IMPLANT -std=c11 -Wall -Wextra -Werror -pthread \
  -I"$K/include" -I"$K/src" \
  "$HERE/src/p0_native_host.c" "$HERE/src/p0_native_null_driver.c" "${KSRC[@]}" -lm -lpthread \
  -o "$OUT/p0_genesis_implant_null_host"
"$OUT/p0_genesis_implant_null_host" --genesis-implant-selftest > "$OUT/GENESIS_IMPLANT_OP2_SELFTEST.json"
grep -q '"pass":true' "$OUT/GENESIS_IMPLANT_OP2_SELFTEST.json"
printf 'built %s\n' "$OUT/p0_genesis_implant_null_host"
cat "$OUT/GENESIS_IMPLANT_OP2_SELFTEST.json"
