#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
K="$ROOT/tools/realtime-p0/native-p0/genesis-kernel"
W="$ROOT/tools/browser-implant/wasm"
OUT="$ROOT/tools/browser-implant/build-wasm/xensonar-c11.wasm"
CC=${CC_WASM:-clang}
SRC=(
 "$W/xen_wasm_bridge.c" "$W/xen_wasm_runtime.c" "$W/xen_recorder_browser.c"
 "$K/src/core/xen_engine.c" "$K/src/core/xen_command.c" "$K/src/core/xen_voice.c" "$K/src/core/xen_entrophon.c" "$K/src/core/xen_asset.c"
 "$K/src/dsp/xen_dsp.c" "$K/src/programs/xen_prog_granular.c"
)
EX=(xen_wasm_init xen_wasm_init_profile xen_wasm_destroy xen_wasm_epoch xen_wasm_panic xen_wasm_submit_record xen_wasm_submit_tone_record xen_wasm_record_scratch_ptr xen_wasm_output_l_ptr xen_wasm_output_r_ptr xen_wasm_output_aux_ptr xen_wasm_max_render_frames xen_wasm_render)
FLAGS=(--target=wasm32 -std=c11 -O2 -nostdlib -ffreestanding -I"$W/shim/include" -I"$K/include" -I"$K/src" -I"$W" -Wl,--no-entry -Wl,--export-memory -Wl,--allow-undefined -Wl,-z,stack-size=262144 -Wl,--initial-memory=33554432 -Wl,--max-memory=33554432)
for e in "${EX[@]}"; do FLAGS+=("-Wl,--export=$e"); done
mkdir -p "$(dirname "$OUT")"
"$CC" "${FLAGS[@]}" "${SRC[@]}" -o "$OUT"
node "$ROOT/tools/browser-implant/embed-wasm.mjs" "$OUT" "$ROOT/src/features/xensonar/browserImplant/generated/xensonarC11WasmEmbedded.ts"
sha256sum "$OUT" > "$OUT.sha256"
echo "[browser-implant] built real OP2 kernel WASM: $OUT"
