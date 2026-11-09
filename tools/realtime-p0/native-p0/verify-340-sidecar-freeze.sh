#!/usr/bin/env bash
set -euo pipefail
export LC_ALL=C
HERE="$(cd "$(dirname "$0")" && pwd)"
TOP="$(cd "$HERE/../../.." && pwd)"
ZIP="$TOP/evidence/physical-sidecar-340/Xensonar_340_PHYSICAL_SIDECAR_RESULT_20260922_004247.zip"
OUT="$HERE/artifacts/P0N_340_SIDECAR_FREEZE_VERIFICATION.json"
prod="$(cd "$TOP" && find src -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum | awk '{print $1}')"
core="$(sha256sum "$TOP/tools/realtime-p0/core/p0_core.c" | awk '{print $1}')"
wasm="$(sha256sum "$TOP/tools/realtime-p0/artifacts/p0_core.wasm" | awk '{print $1}')"
worklet="$(sha256sum "$TOP/tools/realtime-p0/worklet/p0-worklet.js" | awk '{print $1}')"
python3 - "$ZIP" "$OUT" "$prod" "$core" "$wasm" "$worklet" <<'PY'
import json,sys,zipfile
zp,out,prod,core,wasm,worklet=sys.argv[1:]
exp={'productSrc':'8c5f5ba8176ecb44e6a59582a201fed0581f3ec2f02c4577164523124135cf1d','p0Core':'26ffa235455db92ce3a781c6ec96e2aa38670d79650c1c256b732fd857fcf98e','p0Wasm':'8add51d3875c0b4c5187b4ce8a581f03f3bc238b29b2f3277f05608e62809aa0','p0Worklet':'31248b6d2f8c594dd3fe94d4845a396d51c1f5bb5eb9a18954563391ae433a00'}
actual={'productSrc':prod,'p0Core':core,'p0Wasm':wasm,'p0Worklet':worklet}
checks={k:actual[k]==exp[k] for k in exp}
with zipfile.ZipFile(zp) as z:
    result=z.read('RESULT.txt').decode()
    gate=json.loads(z.read('artifacts/P0N_PIPEWIRE_SIDECAR_GATE.json'))
    val=json.loads(z.read('artifacts/P0N_SIDECAR_PHYSICAL_VALIDATION.json'))
checks['physical340Result']='STATUS=PASS' in result and 'physical-pipewire-localhost-sidecar-pass' in result
checks['physical340Gate']=gate.get('status')=='PASS' and gate.get('physicalAudio') is True
checks['physical340Evidence']=val.get('pass') is True and val.get('checks')==36 and not val.get('failed') and val.get('deviceQuantumFrames',0)>0
obj={'status':'PASS' if all(checks.values()) else 'FAIL','claim':'340-physical-sidecar-freeze-prerequisite','checks':checks,'actual':actual,'expected':exp}
open(out,'w').write(json.dumps(obj,separators=(',',':'))+'\n'); print(json.dumps(obj,separators=(',',':')))
raise SystemExit(0 if obj['status']=='PASS' else 4)
PY
