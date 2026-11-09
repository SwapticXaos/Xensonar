#!/usr/bin/env python3
import json,sys
from pathlib import Path
from evidence_common import CheckSet, write_json
if len(sys.argv)!=3: raise SystemExit('usage: validate-browser-lab-evidence.py INPUT OUTPUT')
j=json.load(open(sys.argv[1])); checks={}
checks['claim']=j.get('claim')=='physical-browser-localhost-sidecar-native-rt'
checks['selftestPass']=j.get('pass') is True
r=j.get('ready') or {}; f=j.get('finalStatus') or {}; inner=j.get('checks') or {}
checks['physical']=r.get('physicalAudio') is True
checks['format']=r.get('sampleRate')==48000 and r.get('channels')==2 and int(r.get('deviceQuantumFrames',0))>0
checks['browserReport']=int(f.get('browserReportSeen',0))==1 and int(f.get('browserReportPass',0))==1 and int(f.get('browserReportFailed',1))==0 and int(f.get('browserReportChecks',0))>=12
checks['browserProgress']=int(f.get('browserProgressStage',0))>=10
checks['clock']=0<int(f.get('browserClockRttUs',0))<250000
checks['latestWins']=int(f.get('browserFinalRevision',0))==116 and int(f.get('mailboxRevision',0))>=116
checks['freshAndStale']=int(f.get('transportStarted',0))>=1 and int(f.get('transportStale',0))>=1
checks['terminal']=int(f.get('ownerClosed',0))==1
checks['noBacklog']=int(f.get('queueDepth',-1))==0
checks['deviceClean']=int(f.get('xrunCount',-1))==0 and int(f.get('processErrors',-1))==0
checks['allInner']=bool(inner) and all(inner.values())
cs=CheckSet(); cs.extend(checks.items())
out=cs.result('physical-browser-lab-evidence-validation',browser=j.get('browser'),deviceQuantumFrames=r.get('deviceQuantumFrames'),clockRttUs=f.get('browserClockRttUs'))
write_json(Path(sys.argv[2]),out); print(json.dumps(out,separators=(',',':')))
raise SystemExit(0 if out['pass'] else 4)
