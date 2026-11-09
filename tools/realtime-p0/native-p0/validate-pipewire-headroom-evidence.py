#!/usr/bin/env python3
import json, sys
from pathlib import Path
from evidence_common import CheckSet, write_json

if len(sys.argv) != 3:
    raise SystemExit("usage: validate-pipewire-headroom-evidence.py INPUT.ndjson OUTPUT.json")

src, out = map(Path, sys.argv[1:])
rows=[]
for line in src.read_text(encoding='utf-8').splitlines():
    line=line.strip()
    if line:
        rows.append(json.loads(line))

checks=CheckSet()
def check(cond, name):
    checks.add(name, cond)

begin=next((r for r in rows if r.get('type')=='headroom-begin'), None)
end=next((r for r in rows if r.get('type')=='headroom-end'), None)
sc=[r for r in rows if r.get('type')=='headroom-scenario']
check(begin is not None, 'begin-present')
check(end is not None, 'end-present')
check(len(sc)==4, 'four-scenarios')
check(bool(begin and begin.get('physicalAudio') is True), 'physical-begin')
check(bool(end and end.get('physicalAudio') is True), 'physical-end')
check(bool(end and end.get('pass') is True), 'end-pass')
expected=[8,16,32,64]
check([r.get('bodies') for r in sc]==expected, 'scenario-order-8-16-32-64')
for r in sc:
    b=r.get('bodies')
    p=f'bodies-{b}'
    check(r.get('physicalAudio') is True, p+'-physical')
    check(r.get('sampleRate')==48000, p+'-48k')
    check(r.get('channels')==2, p+'-stereo')
    check(isinstance(r.get('deviceQuantumFrames'), int) and r['deviceQuantumFrames']>0, p+'-quantum')
    check(r.get('callbackDelta',0)>=r.get('minimumCallbacks',1), p+'-callback-cadence')
    check(r.get('measuredCallbacks',0)>0 and r.get('storedSamples',0)>0, p+'-samples')
    check(r.get('xrunDelta')==0, p+'-zero-xrun')
    check(r.get('processErrorDelta')==0, p+'-zero-process-errors')
    check(r.get('budgetMisses')==0, p+'-zero-budget-misses')
    check(r.get('p50Ns',0)>0 and r.get('p95Ns',0)>=r.get('p50Ns',0) and r.get('p99Ns',0)>=r.get('p95Ns',0) and r.get('maxNs',0)>=r.get('p99Ns',0), p+'-ordered-stats')
    check(r.get('nonzeroFrames',0)>0 and r.get('peak',0)>0, p+'-signal-generated')
    check(r.get('pass') is True, p+'-pass')

result={
    **checks.result('physical-pipewire-synthetic-headroom-evidence-validation'),
    'scenarios':[
        {k:r.get(k) for k in ('bodies','deviceQuantumFrames','callbackDelta','xrunDelta','processErrorDelta','budgetMisses','p50Ns','p95Ns','p99Ns','maxNs','p99QuantumPct','maxQuantumPct','renderBusyPct','peak')}
        for r in sc
    ]
}
write_json(out,result)
print(json.dumps(result,separators=(',',':')))
raise SystemExit(0 if result['pass'] else 1)
