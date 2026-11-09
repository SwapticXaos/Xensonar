#!/usr/bin/env python3
import http.client, json, math, os, struct, subprocess, sys, time
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BIN=Path(os.environ.get('P0N_OP2_BIN', str(ROOT/'artifacts'/'p0_genesis_implant_null_host')))
OUT=ROOT/'artifacts'/'GENESIS_IMPLANT_OP2_RESOLVED_WAVESTARTER_SIDECAR.json'

def req(port,origin,token,sid,method,path,body=None,content_type=None):
    headers={'Origin':origin,'X-Xensonar-Token':token,'X-Xensonar-Session':sid}
    if body is not None:
        if isinstance(body,str): body=body.encode()
        headers['Content-Type']=content_type or 'application/octet-stream'
        headers['Content-Length']=str(len(body))
    c=http.client.HTTPConnection('127.0.0.1',port,timeout=3)
    c.request(method,path,body=body,headers=headers)
    r=c.getresponse(); raw=r.read().decode(); code=r.status; c.close()
    try:data=json.loads(raw)
    except Exception:data={'raw':raw}
    return code,data

def status(port,origin,token,sid): return req(port,origin,token,sid,'GET','/v1/status')
def wait_status(port,origin,token,sid,pred,seconds=1.5):
    end=time.time()+seconds; last=None
    while time.time()<end:
        code,last=status(port,origin,token,sid)
        if code==200 and pred(last): return last
        time.sleep(0.01)
    return last

def pack(seq,source,tones):
    b=bytearray(struct.pack('<IIQQII',0x32535758,1,seq,source,len(tones),0))
    wf={'sine':0,'triangle':1,'sawtooth':2,'square':3}
    for t in tones:
        b.extend(struct.pack('<ffffIIII',float(t['hz']),float(t['gain']),float(t['cutoff']),float(t['q']),int(t['delay']),int(t['duration']),wf[t['waveform']],0))
    return bytes(b)

tones=[
    dict(hz=329.63,gain=0.08,cutoff=4200,q=0.9,delay=0,duration=7200,waveform='sine'),
    dict(hz=494.445,gain=0.035,cutoff=3200,q=1.2,delay=96,duration=5000,waveform='triangle'),
]

p=subprocess.Popen([str(BIN),'--sidecar-null'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,bufsize=1)
ready_line=p.stdout.readline().strip()
try: ready=json.loads(ready_line)
except Exception:
    p.kill(); raise SystemExit(f'bad ready: {ready_line!r}')
port=int(ready['port']); origin=ready['origin']; token=ready['token']; sid=ready['sessionId']; checks={}; final=None
try:
    code,before=status(port,origin,token,sid)
    checks['statusReady']=code==200 and int(before.get('sampleRate',0))==48000
    source=int(before['frame']); started0=int(before.get('waveStarterAttacksStarted',0)); peak0=int(before.get('waveStarterPeakMaxMicros',0))
    code,accepted=req(port,origin,token,sid,'POST','/v1/wavestarter/resolved-attack',pack(9101,source,tones))
    checks['resolvedIngressAccepted']=code==202 and accepted.get('renderer')=='genesis-c11-resolved-tone-plan-op2' and accepted.get('parity')=='parameter-plan-core-v1' and int(accepted.get('tones',0))==2
    fresh=wait_status(port,origin,token,sid,lambda s:int(s.get('waveStarterAttacksStarted',0))>=started0+1 and int(s.get('waveStarterPeakMaxMicros',0))>peak0)
    checks['resolvedPlanExecuted']=bool(fresh and int(fresh.get('waveStarterAttacksStarted',0))>=started0+1)
    checks['resolvedPcmNonzero']=bool(fresh and int(fresh.get('waveStarterPeakMaxMicros',0))>peak0)

    # Malformed/invalid execution data is rejected before the kernel scheduler.
    bad=bytearray(pack(9102,int(fresh['frame'] if fresh else source),tones))
    struct.pack_into('<f',bad,32,float('nan'))
    code,obj=req(port,origin,token,sid,'POST','/v1/wavestarter/resolved-attack',bytes(bad))
    checks['nanRejectedAtIngress']=code==400 and obj.get('error')=='bad-wavestarter-resolved-attack'

    # Old intent is not rejuvenated into a now-attack.
    _,pre=status(port,origin,token,sid)
    stale_source=max(0,int(pre['frame'])-20000); started_before=int(pre.get('waveStarterAttacksStarted',0))
    code,obj=req(port,origin,token,sid,'POST','/v1/wavestarter/resolved-attack',pack(9103,stale_source,tones))
    time.sleep(0.05); _,post=status(port,origin,token,sid)
    checks['staleResolvedRejected']=code==409 and obj.get('error')=='bad-wavestarter-resolved-attack' and int(post.get('waveStarterAttacksStarted',0))==started_before

    code,_=req(port,origin,token,sid,'POST','/v1/panic',b'', 'application/x-www-form-urlencoded')
    checks['panicAccepted']=code==200
    pan=wait_status(port,origin,token,sid,lambda s:int(s.get('ownerClosed',0))==1)
    checks['panicClosesOwner']=bool(pan and int(pan.get('ownerClosed',0))==1)
    if pan:
        started=int(pan.get('waveStarterAttacksStarted',0)); src=int(pan['frame'])
        code,obj=req(port,origin,token,sid,'POST','/v1/wavestarter/resolved-attack',pack(9104,src,tones))
        time.sleep(0.03); _,after=status(port,origin,token,sid)
        checks['postPanicResolvedRejected']=code==400 and obj.get('error')=='bad-wavestarter-resolved-attack' and int(after.get('waveStarterAttacksStarted',0))==started
    else: checks['postPanicResolvedRejected']=False
    _,final=status(port,origin,token,sid)
    code,_=req(port,origin,token,sid,'POST','/v1/shutdown',b'', 'application/x-www-form-urlencoded')
    checks['shutdownAccepted']=code==200
finally:
    try:p.wait(timeout=3)
    except subprocess.TimeoutExpired:p.kill();p.wait()
    stderr=p.stderr.read().strip() if p.stderr else ''
passed=all(checks.values()) and p.returncode==0
obj={'pass':passed,'claim':'genesis-op2-resolved-wavestarter-sidecar-execution','checks':checks,'ready':{k:v for k,v in ready.items() if k!='token'},'finalStatus':final,'processExit':p.returncode,'stderr':stderr,'parity':'parameter-plan-core-v1-only'}
OUT.write_text(json.dumps(obj,indent=2,sort_keys=True)+'\n')
print(json.dumps(obj,separators=(',',':')))
sys.exit(0 if passed else 4)
