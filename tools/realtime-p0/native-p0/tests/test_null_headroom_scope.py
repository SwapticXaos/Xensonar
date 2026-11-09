#!/usr/bin/env python3
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
rows=[json.loads(x) for x in (ROOT/'artifacts/P0N_PHYSICAL_HEADROOM_NULL_SELFTEST.ndjson').read_text().splitlines() if x.strip()]
sc=[r for r in rows if r.get('type')=='headroom-scenario']
checks={
  'fourScenarios':len(sc)==4 and [r.get('bodies') for r in sc]==[8,16,32,64],
  'nullMode':all(r.get('physicalAudio') is False for r in sc),
  'timingNotGate':all(r.get('timingGate') is False for r in sc),
  'harnessPass':all(r.get('pass') is True for r in sc),
  'callbacksSeen':all(int(r.get('callbackDelta',0))>0 for r in sc),
  'signalSeen':all(int(r.get('nonzeroFrames',0))>0 and float(r.get('peak',0))>0 for r in sc),
}
out={'pass':all(checks.values()),'checks':checks,'claim':'null-headroom-proof-scope'}
print(json.dumps(out,separators=(',',':')))
raise SystemExit(0 if out['pass'] else 4)
