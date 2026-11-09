#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
EVID="$ROOT/evidence/physical-headroom-338"
OUT="$HERE/artifacts/P0N_338_HEADROOM_FREEZE_VERIFICATION.json"
EXPECTED_SRC="8c5f5ba8176ecb44e6a59582a201fed0581f3ec2f02c4577164523124135cf1d"
EXPECTED_CORE="26ffa235455db92ce3a781c6ec96e2aa38670d79650c1c256b732fd857fcf98e"
EXPECTED_WASM="8add51d3875c0b4c5187b4ce8a581f03f3bc238b29b2f3277f05608e62809aa0"
EXPECTED_WORKLET="31248b6d2f8c594dd3fe94d4845a396d51c1f5bb5eb9a18954563391ae433a00"
ACTUAL_SRC="$(cd "$ROOT" && LC_ALL=C find src -type f -print0 | LC_ALL=C sort -z | xargs -0 sha256sum | sha256sum | awk '{print $1}')"
ACTUAL_CORE="$(sha256sum "$ROOT/tools/realtime-p0/core/p0_core.c" | awk '{print $1}')"
ACTUAL_WASM="$(sha256sum "$ROOT/tools/realtime-p0/artifacts/p0_core.wasm" | awk '{print $1}')"
ACTUAL_WORKLET="$(sha256sum "$ROOT/tools/realtime-p0/worklet/p0-worklet.js" | awk '{print $1}')"
for f in RESULT.txt P0N_PIPEWIRE_HEADROOM_GATE.json P0N_PIPEWIRE_PHYSICAL_HEADROOM_VALIDATION.json P0N_336_FREEZE_VERIFICATION.json; do [[ -s "$EVID/$f" ]]; done
( cd "$EVID" && sha256sum -c SHA256SUMS.txt >/dev/null )
python3 - "$EVID/P0N_PIPEWIRE_HEADROOM_GATE.json" "$EVID/P0N_PIPEWIRE_PHYSICAL_HEADROOM_VALIDATION.json" <<'PY'
import json,sys
g=json.load(open(sys.argv[1]));v=json.load(open(sys.argv[2]))
assert g.get('status')=='PASS' and g.get('physicalAudio') is True
assert v.get('pass') is True and v.get('claim')=='physical-pipewire-synthetic-headroom-evidence-validation'
assert len(v.get('scenarios',[]))==4 and [x.get('bodies') for x in v['scenarios']]==[8,16,32,64]
assert all(x.get('xrunDelta')==0 and x.get('processErrorDelta')==0 and x.get('budgetMisses')==0 for x in v['scenarios'])
PY
pass=true
[[ "$ACTUAL_SRC" == "$EXPECTED_SRC" ]] || pass=false
[[ "$ACTUAL_CORE" == "$EXPECTED_CORE" ]] || pass=false
[[ "$ACTUAL_WASM" == "$EXPECTED_WASM" ]] || pass=false
[[ "$ACTUAL_WORKLET" == "$EXPECTED_WORKLET" ]] || pass=false
printf '{"status":"%s","claim":"338-physical-headroom-freeze-prerequisite","physicalHeadroomEvidence":true,"productSrc":{"actual":"%s","expected":"%s"},"p0Core":{"actual":"%s","expected":"%s"},"p0Wasm":{"actual":"%s","expected":"%s"},"p0Worklet":{"actual":"%s","expected":"%s"}}\n' \
  "$([[ "$pass" == true ]] && echo PASS || echo FAIL)" "$ACTUAL_SRC" "$EXPECTED_SRC" "$ACTUAL_CORE" "$EXPECTED_CORE" "$ACTUAL_WASM" "$EXPECTED_WASM" "$ACTUAL_WORKLET" "$EXPECTED_WORKLET" > "$OUT"
[[ "$pass" == true ]]
echo "338-headroom-freeze-pass $OUT"
