#!/usr/bin/env python3
import argparse,json,sys
from pathlib import Path
from evidence_common import CheckSet, write_json
ap=argparse.ArgumentParser();ap.add_argument('input');ap.add_argument('output');ap.add_argument('--physical',action='store_true');a=ap.parse_args()
j=json.load(open(a.input))
expected=[
'missingTokenRejected','wrongOriginRejected','statusReachable','backendModeCorrect','heartbeatAccepted',
'stateRevision2Accepted','staleStateRejected','latestStateWinsInMailbox','freshAttackIngressAccepted','freshAttackStarted',
'staleAttackIngressBoundedAccepted','staleAttackDroppedInRT','controlSilenceEngineProgress','controlSilenceNoBacklog',
'controlSilenceNoDeviceFault','controlSilenceOwnerAlive','panicAccepted','panicClosesOwner','postPanicIngressBounded',
'postPanicNoResurrection','oversizedBodyRejected','shutdownAccepted']
checks=CheckSet()
def ck(name,ok): checks.add(name,ok)
ck('producerPass',j.get('pass') is True)
for k in expected: ck(k,j.get('checks',{}).get(k) is True)
r=j.get('ready') or {}; f=j.get('finalStatus') or {}
ck('loopbackBind',r.get('bind')=='127.0.0.1')
ck('sampleRate48k',r.get('sampleRate')==48000)
ck('stereo',r.get('channels')==2)
ck('physicalMode',bool(r.get('physicalAudio'))==bool(a.physical))
if a.physical:
  ck('readyDeviceQuantum',int(r.get('deviceQuantumFrames') or 0)>0)
  ck('readyCallbackSeen',int(r.get('callbacks') or 0)>0)
  ck('finalDeviceQuantum',int(f.get('deviceQuantumFrames') or 0)>0)
  ck('zeroFinalXrun',int(f.get('xrunCount') or 0)==0)
  ck('zeroFinalProcessErrors',int(f.get('processErrors') or 0)==0)
ck('queueDrained',int(f.get('queueDepth') or 0)==0)
ck('staleObserved',int(f.get('transportStale') or 0)>=1)
ck('terminalPanic',int(f.get('ownerClosed') or 0)==1)
ck('securityRejections',int(f.get('rejectedRequests') or 0)>=2)
out=checks.result('physical-pipewire-localhost-sidecar-evidence-validation' if a.physical else 'localhost-sidecar-evidence-validation',physicalAudio=bool(a.physical),deviceQuantumFrames=r.get('deviceQuantumFrames',0),readyCallbacks=r.get('callbacks',0),finalDeviceQuantumFrames=f.get('deviceQuantumFrames',0))
write_json(Path(a.output),out)
print(json.dumps(out,separators=(',',':')))
sys.exit(0 if not failed else 4)
