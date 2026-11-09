#!/usr/bin/env python3
import http.client,json,subprocess,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BIN=ROOT/'artifacts'/'p0_native_null_host'
OUT=ROOT/'artifacts'/'P0N_WAVESTARTER_SYNTH_SIDECAR_TEST.json'

def req(port,origin,token,sid,method,path,body=None):
    headers={'Origin':origin,'X-Xensonar-Token':token,'X-Xensonar-Session':sid}
    payload=None
    if body is not None:
        payload=body.encode();headers['Content-Type']='application/x-www-form-urlencoded';headers['Content-Length']=str(len(payload))
    c=http.client.HTTPConnection('127.0.0.1',port,timeout=3)
    c.request(method,path,body=payload,headers=headers)
    r=c.getresponse();raw=r.read().decode();code=r.status;c.close()
    try:data=json.loads(raw)
    except Exception:data={'raw':raw}
    return code,data

def status(port,origin,token,sid): return req(port,origin,token,sid,'GET','/v1/status')
def wait_status(port,origin,token,sid,pred,seconds=1.5):
    end=time.time()+seconds;last=None
    while time.time()<end:
        code,last=status(port,origin,token,sid)
        if code==200 and pred(last): return last
        time.sleep(0.015)
    return last

p=subprocess.Popen([str(BIN),'--sidecar-null'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,bufsize=1)
ready_line=p.stdout.readline().strip()
try: ready=json.loads(ready_line)
except Exception:
    p.kill();raise SystemExit(f'bad ready: {ready_line!r}')
port=int(ready['port']);origin=ready['origin'];token=ready['token'];sid=ready['sessionId'];checks={};final_status=None
try:
    code,before=status(port,origin,token,sid)
    checks['statusReady']=code==200 and int(before.get('sampleRate',0))==48000
    source=int(before['frame']);started0=int(before.get('waveStarterAttacksStarted',0));nonzero0=int(before.get('waveStarterNonzeroCallbacks',0));peak0=int(before.get('waveStarterPeakMaxMicros',0))
    body=f'sequence=7001&sourceFrame={source}&preset=reed_sigh&frequency=329.63&peak=0.08'
    code,accepted=req(port,origin,token,sid,'POST','/v1/wavestarter/attack',body)
    checks['freshIngressAccepted']=code==202 and accepted.get('renderer')=='wavestarter-synth-v1'
    fresh=wait_status(port,origin,token,sid,lambda s:int(s.get('waveStarterAttacksStarted',0))>=started0+1 and int(s.get('waveStarterNonzeroCallbacks',0))>nonzero0)
    checks['freshVoiceStarted']=bool(fresh and int(fresh.get('waveStarterAttacksStarted',0))>=started0+1)
    checks['freshPcmNonzero']=bool(fresh and int(fresh.get('waveStarterNonzeroCallbacks',0))>nonzero0 and int(fresh.get('waveStarterPeakMaxMicros',0))>max(peak0,0))
    checks['queueBoundedAfterFresh']=bool(fresh and 0<=int(fresh.get('waveStarterQueueDepth',-1))<=64)

    time.sleep(0.15)
    _,pre_stale=status(port,origin,token,sid)
    stale0=int(pre_stale.get('waveStarterAttacksStale',0));started_before_stale=int(pre_stale.get('waveStarterAttacksStarted',0))
    stale_source=max(0,int(pre_stale['frame'])-10000)
    code,_=req(port,origin,token,sid,'POST','/v1/wavestarter/attack',f'sequence=7002&sourceFrame={stale_source}&preset=glass_ping&frequency=440&peak=0.08')
    checks['staleIngressAcceptedBounded']=code==202
    stale=wait_status(port,origin,token,sid,lambda s:int(s.get('waveStarterAttacksStale',0))>=stale0+1)
    checks['staleDroppedNotStarted']=bool(stale and int(stale.get('waveStarterAttacksStale',0))>=stale0+1 and int(stale.get('waveStarterAttacksStarted',0))==started_before_stale)

    # Unknown preset must fail before reaching the RT ring.
    _,pre_bad=status(port,origin,token,sid);rej0=int(pre_bad.get('waveStarterAttacksRejected',0));q0=int(pre_bad.get('waveStarterQueueDepth',0))
    code,bad=req(port,origin,token,sid,'POST','/v1/wavestarter/attack',f'sequence=7003&sourceFrame={int(pre_bad["frame"])}&preset=not_a_real_preset&frequency=440&peak=0.08')
    _,post_bad=status(port,origin,token,sid)
    checks['unknownPresetRejectedAtIngress']=code==400 and bad.get('error')=='bad-wavestarter-attack' and int(post_bad.get('waveStarterQueueDepth',0))==q0 and int(post_bad.get('waveStarterAttacksRejected',0))==rej0

    code,_=req(port,origin,token,sid,'POST','/v1/panic','')
    checks['panicAccepted']=code==200
    pan=wait_status(port,origin,token,sid,lambda s:int(s.get('ownerClosed',0))==1)
    checks['panicClosesOwner']=bool(pan and int(pan.get('ownerClosed',0))==1)
    if pan:
        ws_started=int(pan.get('waveStarterAttacksStarted',0));source=int(pan['frame'])
        code,bad=req(port,origin,token,sid,'POST','/v1/wavestarter/attack',f'sequence=7004&sourceFrame={source}&preset=deep_sub&frequency=220&peak=0.08')
        time.sleep(0.05);_,after=status(port,origin,token,sid)
        checks['postPanicIngressRejected']=code==400 and bad.get('error')=='bad-wavestarter-attack'
        checks['postPanicNoResurrection']=int(after.get('waveStarterAttacksStarted',0))==ws_started and int(after.get('waveStarterActiveVoices',0))==0
    else:
        checks['postPanicIngressRejected']=False;checks['postPanicNoResurrection']=False
    _,final_status=status(port,origin,token,sid)
    code,_=req(port,origin,token,sid,'POST','/v1/shutdown','')
    checks['shutdownAccepted']=code==200
finally:
    try:p.wait(timeout=3)
    except subprocess.TimeoutExpired:p.kill();p.wait()
    stderr=p.stderr.read().strip() if p.stderr else ''
passed=all(checks.values()) and p.returncode==0
obj={'pass':passed,'claim':'wavestarter-synth-sidecar-to-rt-pcm-semantics','checks':checks,'ready':{k:v for k,v in ready.items() if k!='token'},'finalStatus':final_status,'processExit':p.returncode,'stderr':stderr}
OUT.write_text(json.dumps(obj,indent=2,sort_keys=True)+'\n')
print(json.dumps(obj,separators=(',',':')))
sys.exit(0 if passed else 4)
