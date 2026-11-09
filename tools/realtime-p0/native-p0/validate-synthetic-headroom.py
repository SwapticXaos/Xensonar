#!/usr/bin/env python3
import json, sys
from pathlib import Path

p = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).with_name('artifacts') / 'P0N_SYNTHETIC_HEADROOM.json'
d = json.loads(p.read_text())
errors = []
if d.get('schema') != 'xensonar.p0n.synthetic-headroom.v1': errors.append('schema')
if d.get('physicalAudio') is not False: errors.append('physicalAudio-must-be-false')
if d.get('claim') != 'synthetic-steady-state-dsp-cost-only': errors.append('claim')
if d.get('sampleRate') != 48000 or d.get('blockFrames') != 128: errors.append('fixture')
if 'no ingress/program/lifecycle work' not in d.get('bodyDefinition',''): errors.append('bodyDefinition')
sc = d.get('scenarios') or []
if [x.get('bodies') for x in sc] != [8,16,32,64]: errors.append('scenario-counts')
for x in sc:
    vals = [x.get('p50Ns'), x.get('p95Ns'), x.get('p99Ns'), x.get('maxNs')]
    if any(not isinstance(v, int) or v <= 0 for v in vals): errors.append(f"timing-{x.get('bodies')}")
    elif not (vals[0] <= vals[1] <= vals[2] <= vals[3]): errors.append(f"percentiles-{x.get('bodies')}")
    if x.get('quantumNs') != 2666666: errors.append(f"quantum-{x.get('bodies')}")
print(json.dumps({
    'pass': not errors,
    'errors': errors,
    'claim': 'schema-and-separation-validation-only',
    'physicalAudio': False,
    'performanceGate': False,
    'source': str(p)
}, separators=(',',':')))
sys.exit(0 if not errors else 2)
