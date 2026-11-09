#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
K="$HERE/genesis-kernel"
OUT="$HERE/artifacts"
mkdir -p "$OUT"

printf '%s\n' '[1/8] Genesis kernel acceptance suite'
make -C "$K" clean >/dev/null
make -C "$K" -j2 >/dev/null
make -C "$K" test

printf '%s\n' '[2/8] OP2 sidecar build + implant selftest'
"$HERE/build-genesis-implant-null.sh"

printf '%s\n' '[3/8] Resolved WaveStarter sidecar route'
python3 "$HERE/tests/test_genesis_resolved_wavestarter_sidecar.py"

printf '%s\n' '[4/8] Browser control binary contract'
node "$HERE/tests/test_browser_control_adapter.mjs"

printf '%s\n' '[5/8] Canonical preset manifest parity'
python3 "$HERE/tests/test_wavestarter_preset_manifest_parity.py"

printf '%s\n' '[6/8] Product amputation scope'
python3 "$HERE/tests/test_genesis_op2_product_scope.py"

printf '%s\n' '[7/8] Existing WaveStarter ownership contracts'
python3 "$HERE/tests/test_native_wave_starter_pilot_contract.py"
python3 "$HERE/tests/test_wave_starter_render_class_ownership.py"

printf '%s\n' '[8/8] 15-preset native parameter-plan palette'
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
cc -O2 -ffp-contract=off -fno-fast-math -fno-builtin -D_GNU_SOURCE -std=c11 -Wall -Wextra -Werror -pthread \
  -I"$K/include" -I"$K/src" -I"$HERE/src" \
  "$HERE/tests/test_genesis_wavestarter_palette.c" "${KSRC[@]}" -lm -lpthread \
  -o "$OUT/test_genesis_wavestarter_palette"
"$OUT/test_genesis_wavestarter_palette"

printf '%s\n' 'GENESIS_IMPLANT_OP2_VALIDATION_PASS'
