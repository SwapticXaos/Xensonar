#!/usr/bin/env bash
set -euo pipefail
export LC_ALL=C
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
OUT="$HERE/artifacts"
mkdir -p "$OUT"

python3 "$HERE/tests/test_wavestarter_synth_palette_product_scope.py" > "$OUT/P0N_WAVESTARTER_SYNTH_PALETTE_PRODUCT_SCOPE.json"
python3 "$HERE/tests/test_wavestarter_preset_manifest_parity.py" > "$OUT/P0N_WAVESTARTER_PRESET_MANIFEST_PARITY.json"
python3 "$HERE/tests/test_wavestarter_synth_palette_contract.py" > "$OUT/P0N_WAVESTARTER_SYNTH_PALETTE_CONTRACT.json"

CURRENT_SRC_HASH="$(cd "$ROOT" && find src -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum | awk '{print $1}')"
P0N_EXPECTED_SRC_TREE="$CURRENT_SRC_HASH" P0N_PRODUCT_SRC_CLAIM="native-wavestarter-synth-palette-v1-scoped-delta-from-359" "$HERE/validate-native-p0.sh"

python3 "$HERE/tests/test_native_wave_starter_pilot_contract.py" > "$OUT/P0N_WAVE_STARTER_PILOT_CONTRACT.json"
python3 "$HERE/tests/test_wave_starter_render_class_ownership.py" > "$OUT/P0N_WAVE_STARTER_RENDER_CLASS_OWNERSHIP.json"
python3 "$HERE/tests/test_sidecar_app_mode.py" > "$OUT/P0N_WAVE_STARTER_APP_MODE_TEST.json"

cc -O3 -std=c11 -Wall -Wextra -Werror "$HERE/tests/test_wavestarter_synth_renderer.c" -lm -o "$OUT/test_wavestarter_synth_renderer"
"$OUT/test_wavestarter_synth_renderer" > "$OUT/P0N_WAVESTARTER_SYNTH_RENDERER_TEST.json"
python3 "$HERE/tests/test_wavestarter_synth_sidecar.py" > "$OUT/P0N_WAVESTARTER_SYNTH_SIDECAR_TEST_CONSOLE.json"

python3 - "$OUT" <<'PY'
import json,sys
from pathlib import Path
out=Path(sys.argv[1])
def read(name): return json.loads((out/name).read_text())
parts={
 'nativeGate':read('P0N_NATIVE_VALIDATION_GATE.json'),
 'productScope':read('P0N_WAVESTARTER_SYNTH_PALETTE_PRODUCT_SCOPE.json'),
 'manifestParity':read('P0N_WAVESTARTER_PRESET_MANIFEST_PARITY.json'),
 'paletteContract':read('P0N_WAVESTARTER_SYNTH_PALETTE_CONTRACT.json'),
 'pilotContract':read('P0N_WAVE_STARTER_PILOT_CONTRACT.json'),
 'renderClassOwnership':read('P0N_WAVE_STARTER_RENDER_CLASS_OWNERSHIP.json'),
 'appMode':read('P0N_WAVE_STARTER_APP_MODE_TEST.json'),
 'renderer':read('P0N_WAVESTARTER_SYNTH_RENDERER_TEST.json'),
 'sidecarRendererPath':read('P0N_WAVESTARTER_SYNTH_SIDECAR_TEST.json'),
}
checks={k:bool(v.get('pass')) for k,v in parts.items()}
result={
 'pass':all(checks.values()),
 'claim':'native-wavestarter-classic-synth-palette-v1-prephysical-validation',
 'checks':checks,
 'physicalAudio':False,
 'scope':{
   'nativeNow':'15 classic WaveStarter synth preset core/body definitions',
   'legacyForNow':['one-shot samples','Entrophon','hold/worklet special path'],
   'notClaimed':['full legacy timbre parity','gradient modulation','extra overtone layer','body exciter','swell reinforcement','RFL coexistence physical result'],
 },
 'parts':parts,
}
(out/'P0N_WAVESTARTER_SYNTH_PALETTE_VALIDATION_GATE.json').write_text(json.dumps(result,indent=2,sort_keys=True)+'\n')
print(json.dumps(result,separators=(',',':')))
raise SystemExit(0 if result['pass'] else 1)
PY
printf 'native-wavestarter-synth-palette-validation-pass %s\n' "$OUT/P0N_WAVESTARTER_SYNTH_PALETTE_VALIDATION_GATE.json"
