#!/usr/bin/env bash
set -euo pipefail
export LC_ALL=C
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
OUT="$HERE/artifacts"
mkdir -p "$OUT"
python3 "$HERE/tests/test_wave_starter_pilot_product_scope.py" > "$OUT/P0N_WAVE_STARTER_PILOT_PRODUCT_SCOPE.json"
CURRENT_SRC_HASH="$(cd "$ROOT" && find src -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum | awk '{print $1}')"
P0N_EXPECTED_SRC_TREE="$CURRENT_SRC_HASH" P0N_PRODUCT_SRC_CLAIM="wave-starter-pilot-scoped-delta-from-359" "$HERE/validate-native-p0.sh"
python3 "$HERE/tests/test_native_wave_starter_pilot_contract.py" > "$OUT/P0N_WAVE_STARTER_PILOT_CONTRACT.json"
python3 "$HERE/tests/test_wave_starter_render_class_ownership.py" > "$OUT/P0N_WAVE_STARTER_RENDER_CLASS_OWNERSHIP.json"
python3 "$HERE/tests/test_native_wave_starter_audibility_contract.py" > "$OUT/P0N_WAVE_STARTER_AUDIBILITY_CONTRACT.json"
python3 "$HERE/tests/test_sidecar_app_mode.py" > "$OUT/P0N_WAVE_STARTER_APP_MODE_TEST.json"
python3 - "$OUT/P0N_NATIVE_VALIDATION_GATE.json" "$OUT/P0N_WAVE_STARTER_PILOT_PRODUCT_SCOPE.json" > "$OUT/P0N_WAVE_STARTER_PILOT_VALIDATION_GATE.json" <<'PY'
import json,sys
from pathlib import Path
native=json.load(open(sys.argv[1])); scope=json.load(open(sys.argv[2])); contract=json.load(open(str(Path(sys.argv[1]).with_name('P0N_WAVE_STARTER_PILOT_CONTRACT.json')))); audibility=json.load(open(str(Path(sys.argv[1]).with_name('P0N_WAVE_STARTER_AUDIBILITY_CONTRACT.json')))); appmode=json.load(open(str(Path(sys.argv[1]).with_name('P0N_WAVE_STARTER_APP_MODE_TEST.json'))))
result={'pass':bool(native.get('pass') and scope.get('pass') and contract.get('pass') and audibility.get('pass') and appmode.get('pass')),'claim':'native-wave-starter-pilot-prephysical-validation','productScope':scope,'pilotContract':contract,'audibilityContract':audibility,'appMode':appmode,'nativeGate':native,'physicalAudio':False}
print(json.dumps(result,separators=(',',':')))
raise SystemExit(0 if result['pass'] else 1)
PY
printf 'native-wave-starter-pilot-validation-pass %s\n' "$OUT/P0N_WAVE_STARTER_PILOT_VALIDATION_GATE.json"
