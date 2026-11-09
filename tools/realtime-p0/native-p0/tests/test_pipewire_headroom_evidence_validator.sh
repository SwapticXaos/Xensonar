#!/usr/bin/env bash
set -euo pipefail
export LC_ALL=C
HERE="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$HERE/artifacts"
SRC="$OUT/P0N_PHYSICAL_HEADROOM_NULL_SELFTEST.ndjson"
FIX="$OUT/P0N_PHYSICAL_HEADROOM_VALIDATOR_FIXTURE.ndjson"
BAD="$OUT/P0N_PHYSICAL_HEADROOM_VALIDATOR_BAD_XRUN.ndjson"
OK="$OUT/P0N_PHYSICAL_HEADROOM_VALIDATOR_TEST.json"
python3 - "$SRC" "$FIX" "$BAD" <<'PY'
import json,sys
src,good,bad=sys.argv[1:]
rows=[]
for line in open(src,encoding='utf-8'):
    if not line.strip(): continue
    r=json.loads(line)
    if r.get('type') in ('headroom-begin','headroom-end','headroom-scenario'):
        r['physicalAudio']=True
        if r.get('type')=='headroom-scenario':
            r['backend']='pipewire'
            # Positive validator fixtures are protocol/evidence fixtures, not
            # live performance or scheduler measurements. Normalize runtime-
            # dependent fault counters so host scheduling noise cannot make
            # this schema/validator test flaky.
            r['xrunDelta']=0
            r['processErrorDelta']=0
            r['budgetMisses']=0
            r['pass']=True
        rows.append(r)
with open(good,'w',encoding='utf-8') as f:
    for r in rows:f.write(json.dumps(r,separators=(',',':'))+'\n')
b=[dict(r) for r in rows]
for r in b:
    if r.get('type')=='headroom-scenario' and r.get('bodies')==32:
        r['xrunDelta']=1
        r['pass']=False
        break
with open(bad,'w',encoding='utf-8') as f:
    for r in b:f.write(json.dumps(r,separators=(',',':'))+'\n')
PY
"$HERE/validate-pipewire-headroom-evidence.py" "$FIX" "$OK" >/dev/null
if "$HERE/validate-pipewire-headroom-evidence.py" "$BAD" "$OUT/P0N_PHYSICAL_HEADROOM_VALIDATOR_BAD.json" >/dev/null 2>&1; then
  echo 'negative xrun fixture unexpectedly passed' >&2
  exit 1
fi
echo 'pipewire-headroom-evidence-validator-pass'
