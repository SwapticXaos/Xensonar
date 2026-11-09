#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cat > "$TMP/life.ndjson" <<'EOF'
{"type":"driver-lifecycle","backend":"pipewire","firstCallbacks":8,"stoppedCallbacks":8,"stoppedCallbacksAfterWait":8,"restartedCallbacks":16,"formatPass":true,"restartFormatPass":true,"stopQuiescent":true,"restartPass":true,"pass":true,"physicalAudio":true,"claim":"synthetic-validator-fixture"}
EOF
cat > "$TMP/n1.ndjson" <<'EOF'
{"type":"selftest-begin","backend":"pipewire","sampleRate":48000,"actualSampleRate":48000,"channels":2,"requestedBlockFrames":128,"actualBlockFrames":512,"leaseMs":1500,"formatPass":true,"callbackSeen":true,"physicalAudio":true}
{"type":"stall","ms":100,"frameBefore":6656,"frameAfter":11264,"frameDelta":4608,"expectedFrames":4800,"deviceQuantumFrames":512,"callbackDelta":9,"minimumCallbacks":9,"programStartsBefore":3,"programStartsAfter":3,"callbacksBefore":13,"callbacksAfter":22,"queueDepthBefore":0,"queueDepthAfter":0,"transportStartsBefore":0,"transportStartsAfter":0,"renderBudgetMissesBefore":0,"renderBudgetMissesAfter":0,"ownerClosed":0,"xrunBefore":0,"xrunAfter":0,"deviceErrorsBefore":0,"deviceErrorsAfter":0,"pass":true}
{"type":"stall","ms":250,"frameBefore":12800,"frameAfter":24576,"frameDelta":11776,"expectedFrames":12000,"deviceQuantumFrames":512,"callbackDelta":23,"minimumCallbacks":23,"programStartsBefore":4,"programStartsAfter":7,"callbacksBefore":25,"callbacksAfter":48,"queueDepthBefore":0,"queueDepthAfter":0,"transportStartsBefore":0,"transportStartsAfter":0,"renderBudgetMissesBefore":0,"renderBudgetMissesAfter":0,"ownerClosed":0,"xrunBefore":0,"xrunAfter":0,"deviceErrorsBefore":0,"deviceErrorsAfter":0,"pass":true}
{"type":"stall","ms":500,"frameBefore":26112,"frameAfter":50176,"frameDelta":24064,"expectedFrames":24000,"deviceQuantumFrames":512,"callbackDelta":47,"minimumCallbacks":46,"programStartsBefore":7,"programStartsAfter":11,"callbacksBefore":51,"callbacksAfter":98,"queueDepthBefore":0,"queueDepthAfter":0,"transportStartsBefore":0,"transportStartsAfter":0,"renderBudgetMissesBefore":0,"renderBudgetMissesAfter":0,"ownerClosed":0,"xrunBefore":0,"xrunAfter":0,"deviceErrorsBefore":0,"deviceErrorsAfter":0,"pass":true}
{"type":"stall","ms":1000,"frameBefore":51712,"frameAfter":99840,"frameDelta":48128,"expectedFrames":48000,"deviceQuantumFrames":512,"callbackDelta":94,"minimumCallbacks":93,"programStartsBefore":11,"programStartsAfter":19,"callbacksBefore":101,"callbacksAfter":195,"queueDepthBefore":0,"queueDepthAfter":0,"transportStartsBefore":0,"transportStartsAfter":0,"renderBudgetMissesBefore":0,"renderBudgetMissesAfter":0,"ownerClosed":0,"xrunBefore":0,"xrunAfter":0,"deviceErrorsBefore":0,"deviceErrorsAfter":0,"pass":true}
{"type":"status","label":"final","frame":101888,"programStarts":19,"ownerClosed":0,"callbacks":199,"renderBudgetMisses":0,"renderNsMax":39934,"ringRejected":0,"transportStarted":0,"transportRejected":0,"transportStale":0}
{"type":"device-status","backend":"pipewire","sampleRate":48000,"channels":2,"quantum":512,"callback":199,"callbackFrames":512,"xrunLast":0,"xrunCount":0,"processErrors":0}
{"type":"selftest-end","pass":true,"physicalAudio":true,"claim":"synthetic-validator-fixture"}
EOF
"$HERE/validate-pipewire-n1-evidence.py" "$TMP/life.ndjson" "$TMP/n1.ndjson" "$TMP/pass.json" >/dev/null
grep -q '"pass":true' "$TMP/pass.json"
python3 - "$TMP/n1.ndjson" <<'PY'
import json,sys
p=sys.argv[1]
rows=[json.loads(x) for x in open(p) if x.strip()]
for r in rows:
    if r.get('type')=='stall' and r.get('ms')==500:
        r['xrunAfter']=1
open(p,'w').write(''.join(json.dumps(r,separators=(',',':'))+'\n' for r in rows))
PY
if "$HERE/validate-pipewire-n1-evidence.py" "$TMP/life.ndjson" "$TMP/n1.ndjson" "$TMP/fail.json" >/dev/null 2>&1; then
  echo 'validator accepted injected xrun' >&2
  exit 1
fi
grep -q 'stall-500-xrun-stable' "$TMP/fail.json"
printf 'pipewire-evidence-validator-pass\n'
