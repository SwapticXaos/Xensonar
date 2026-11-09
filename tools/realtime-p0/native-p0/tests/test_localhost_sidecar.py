#!/usr/bin/env python3
import argparse, http.client, json, subprocess, sys, time
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
ap=argparse.ArgumentParser(); ap.add_argument('--physical',action='store_true'); args=ap.parse_args()
BIN=ROOT/'artifacts'/('p0_native_pipewire_sidecar' if args.physical else 'p0_native_null_host')
MODE='--pipewire-sidecar' if args.physical else '--sidecar-null'
OUT=ROOT/'artifacts'/('P0N_SIDECAR_PHYSICAL_SELFTEST.json' if args.physical else 'P0N_SIDECAR_NULL_SELFTEST.json')
SESSION_ID=''

def req(port, origin, token, method, path, body=None, use_token=True, use_origin=True, timeout=2):
    headers={}
    if use_origin: headers['Origin']=origin
    if use_token:
        headers['X-Xensonar-Token']=token
        if SESSION_ID: headers['X-Xensonar-Session']=SESSION_ID
    payload=None
    if body is not None:
        payload=body.encode()
        headers['Content-Type']='application/x-www-form-urlencoded'
        headers['Content-Length']=str(len(payload))
    c=http.client.HTTPConnection('127.0.0.1',port,timeout=timeout)
    c.request(method,path,body=payload,headers=headers)
    r=c.getresponse(); data=r.read().decode(); status=r.status; c.close()
    try: parsed=json.loads(data)
    except Exception: parsed={'raw':data}
    return status, parsed

def wait_status(port,origin,token,pred,seconds=1.0):
    end=time.time()+seconds; last=None
    while time.time()<end:
        code,last=req(port,origin,token,'GET','/v1/status')
        if code==200 and pred(last): return last
        time.sleep(0.02)
    return last

p=subprocess.Popen([str(BIN),MODE],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,bufsize=1)
ready_line=p.stdout.readline().strip()
try: ready=json.loads(ready_line)
except Exception:
    p.kill(); raise SystemExit(f'bad ready line: {ready_line!r}')

if ready.get('type')!='sidecar-ready':
    p.kill(); raise SystemExit(f'sidecar failed readiness: {ready!r}')
port=int(ready['port']); origin=ready['origin']; token=ready['token']; SESSION_ID=ready.get('sessionId',''); checks={}
checks['sessionIdentityReady']=bool(SESSION_ID) and int(ready.get('ownerEpoch',0))>0
final_status=None
try:
    code,_=req(port,origin,token,'GET','/v1/status',use_token=False); checks['missingTokenRejected']=code==403
    code,_=req(port,'http://evil.invalid',token,'GET','/v1/status'); checks['wrongOriginRejected']=code==403
    code,s0=req(port,origin,token,'GET','/v1/status'); checks['statusReachable']=code==200 and s0.get('sampleRate')==48000 and s0.get('channels')==2
    checks['statusIdentityMatches']=code==200 and s0.get('sessionId')==SESSION_ID and int(s0.get('ownerEpoch',0))==int(ready.get('ownerEpoch',0))
    saved_session=SESSION_ID; SESSION_ID='wrong-session'; code,_=req(port,origin,token,'GET','/v1/status'); checks['wrongSessionRejected']=code==403; SESSION_ID=saved_session
    checks['backendModeCorrect']=bool(ready.get('physicalAudio'))==bool(args.physical)
    if args.physical: checks['deviceQuantumNegotiated']=int(ready.get('deviceQuantumFrames',0))>0 and int(ready.get('callbacks',0))>0
    code,_=req(port,origin,token,'POST','/v1/heartbeat',''); checks['heartbeatAccepted']=code==200
    code,_=req(port,origin,token,'POST','/v1/state','revision=2&root=330.0&gain=0.75'); checks['stateRevision2Accepted']=code==200
    code,_=req(port,origin,token,'POST','/v1/state','revision=1&root=110.0&gain=0.1'); checks['staleStateRejected']=code==409
    s_state=wait_status(port,origin,token,lambda s:s.get('mailboxRevision',0)>=2,1.0); checks['latestStateWinsInMailbox']=bool(s_state and s_state.get('mailboxRevision',0)>=2)
    time.sleep(0.15)
    _,before=req(port,origin,token,'GET','/v1/status'); fresh_source=before['frame']; fresh_started=before['transportStarted']
    code,_=req(port,origin,token,'POST','/v1/attack',f'sequence=100&sourceFrame={fresh_source}&slot=70&generation=1&frequency=440.0&peak=0.02'); checks['freshAttackIngressAccepted']=code==202
    after_fresh=wait_status(port,origin,token,lambda s:s.get('transportStarted',0)>=fresh_started+1,1.0); checks['freshAttackStarted']=bool(after_fresh and after_fresh.get('transportStarted',0)>=fresh_started+1)
    time.sleep(0.15)
    _,pre_stale=req(port,origin,token,'GET','/v1/status'); stale_source=max(0,int(pre_stale['frame'])-10000); stale_before=pre_stale['transportStale']; started_before=pre_stale['transportStarted']
    code,_=req(port,origin,token,'POST','/v1/attack',f'sequence=101&sourceFrame={stale_source}&slot=71&generation=1&frequency=523.25&peak=0.02'); checks['staleAttackIngressBoundedAccepted']=code==202
    after_stale=wait_status(port,origin,token,lambda s:s.get('transportStale',0)>=stale_before+1,1.0); checks['staleAttackDroppedInRT']=bool(after_stale and after_stale.get('transportStale',0)>=stale_before+1 and after_stale.get('transportStarted')==started_before)
    code,_=req(port,origin,token,'POST','/v1/heartbeat',''); time.sleep(0.05)
    _,stall_before=req(port,origin,token,'GET','/v1/status'); time.sleep(1.0); _,stall_after=req(port,origin,token,'GET','/v1/status')
    checks['controlSilenceEngineProgress']=stall_after['frame']>stall_before['frame'] and stall_after['callbacks']>stall_before['callbacks']
    checks['controlSilenceNoBacklog']=stall_after['queueDepth']==stall_before['queueDepth'] and stall_after['transportStarted']==stall_before['transportStarted']
    checks['controlSilenceNoDeviceFault']=(stall_after['xrunCount']==stall_before['xrunCount'] and stall_after['processErrors']==stall_before['processErrors']) if args.physical else (stall_after['processErrors']==stall_before['processErrors'])
    checks['controlSilenceOwnerAlive']=stall_after['ownerClosed']==0
    code,_=req(port,origin,token,'POST','/v1/panic',''); checks['panicAccepted']=code==200
    pan=wait_status(port,origin,token,lambda s:s.get('ownerClosed')==1,1.0); checks['panicClosesOwner']=bool(pan and pan.get('ownerClosed')==1)
    if pan:
        p_started=pan['transportStarted']; p_rejected=pan['transportRejected']; source=pan['frame']
        code,_=req(port,origin,token,'POST','/v1/attack',f'sequence=102&sourceFrame={source}&slot=72&generation=1&frequency=659.25&peak=0.02')
        after_panic=wait_status(port,origin,token,lambda s:s.get('transportRejected',0)>=p_rejected+1,1.0)
        checks['postPanicIngressBounded']=code==202
        checks['postPanicNoResurrection']=bool(after_panic and after_panic.get('transportStarted')==p_started and after_panic.get('transportRejected',0)>=p_rejected+1)
    else:
        checks['postPanicIngressBounded']=False; checks['postPanicNoResurrection']=False
    big='x='+'a'*1100; code,_=req(port,origin,token,'POST','/v1/state',big); checks['oversizedBodyRejected']=code==413
    _,final_status=req(port,origin,token,'GET','/v1/status')
    code,_=req(port,origin,token,'POST','/v1/shutdown',''); checks['shutdownAccepted']=code==200
finally:
    try: p.wait(timeout=3)
    except subprocess.TimeoutExpired: p.kill(); p.wait()
stdout_rest=p.stdout.read() if p.stdout else ''; stderr=p.stderr.read() if p.stderr else ''
passed=all(checks.values()) and p.returncode==0
result={'pass':passed,'claim':('physical-pipewire-localhost-sidecar-control-semantics' if args.physical else 'localhost-sidecar-control-semantics-null-driver'),'checks':checks,'ready':{k:v for k,v in ready.items() if k!='token'},'finalStatus':final_status,'processExit':p.returncode,'hostStdoutTail':stdout_rest.strip().splitlines()[-3:],'hostStderr':stderr.strip()}
OUT.write_text(json.dumps(result,indent=2,sort_keys=True)+'\n')
print(json.dumps(result,separators=(',',':')))
sys.exit(0 if passed else 4)
