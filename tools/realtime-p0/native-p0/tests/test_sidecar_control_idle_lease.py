#!/usr/bin/env python3
import http.client, json, subprocess, sys, time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BIN=ROOT/'artifacts'/'p0_native_null_host'
OUT=ROOT/'artifacts'/'P0N_SIDECAR_CONTROL_IDLE_LEASE.json'

def req(port, origin, token, sid, path='/v1/status', body=''):
    payload=body.encode()
    headers={'Origin':origin,'X-Xensonar-Token':token,'X-Xensonar-Session':sid,'Content-Type':'application/x-www-form-urlencoded','Content-Length':str(len(payload))}
    c=http.client.HTTPConnection('127.0.0.1',port,timeout=3)
    c.request('POST',path,body=payload,headers=headers)
    r=c.getresponse(); raw=r.read().decode(); code=r.status; c.close()
    try:data=json.loads(raw)
    except Exception:data={'raw':raw}
    return code,data

p=subprocess.Popen([str(BIN),'--sidecar-null'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,bufsize=1)
ready=json.loads(p.stdout.readline())
port=int(ready['port']); origin=ready['origin']; token=ready['token']; sid=ready['sessionId']; lease_ms=int(ready['controlLeaseMs'])
checks={}
try:
    # No heartbeat at all. Real authenticated work arrives often enough that the
    # browser-control session must remain alive beyond one whole lease interval.
    deadline=time.monotonic()+(lease_ms+1200)/1000.0
    statuses=[]
    while time.monotonic()<deadline:
        code,st=req(port,origin,token,sid)
        statuses.append((code,st))
        if code!=200: break
        time.sleep(0.55)
    checks['survivedBeyondLeaseWithoutHeartbeat']=bool(statuses) and all(c==200 for c,_ in statuses) and (lease_ms>0)
    last=statuses[-1][1] if statuses else {}
    checks['heartbeatNotRequiredDuringActivity']=int(last.get('browserHeartbeatCount',-1))==0
    checks['controlRequestsRenewedIdleLease']=int(last.get('browserControlRenewals',0))>=len(statuses)
    checks['sessionStillActive']=last.get('browserSessionActive') is True
    # Terminal request itself is authenticated activity and must still succeed.
    code,_=req(port,origin,token,sid,'/v1/shutdown','')
    checks['shutdownAccepted']=code==200
finally:
    try:p.wait(timeout=3)
    except subprocess.TimeoutExpired:p.kill();p.wait()
    stderr=p.stderr.read().strip() if p.stderr else ''
passed=all(checks.values()) and p.returncode==0
obj={'pass':passed,'claim':'browser-control-lease-is-idle-lease','checks':checks,'controlLeaseMs':lease_ms,'processExit':p.returncode,'stderr':stderr}
OUT.write_text(json.dumps(obj,indent=2,sort_keys=True)+'\n')
print(json.dumps(obj,separators=(',',':')))
sys.exit(0 if passed else 4)
