#!/usr/bin/env python3
import http.client, json, subprocess, sys, time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BIN=ROOT/'artifacts'/'p0_native_null_host'
OUT=ROOT/'artifacts'/'P0N_SIDECAR_LEASE_SEPARATION.json'

def req(port, origin, token='', session_id='', method='POST', path='/v1/status', body='', auth=True):
    headers={'Origin':origin}
    payload=body.encode()
    if auth:
        headers['X-Xensonar-Token']=token
        headers['X-Xensonar-Session']=session_id
    if method=='POST':
        headers['Content-Type']='application/x-www-form-urlencoded'
        headers['Content-Length']=str(len(payload))
    c=http.client.HTTPConnection('127.0.0.1',port,timeout=3)
    c.request(method,path,body=(payload if method=='POST' else None),headers=headers)
    r=c.getresponse(); raw=r.read().decode(); code=r.status; c.close()
    try: data=json.loads(raw)
    except Exception: data={'raw':raw}
    return code,data

def wait_status(port,origin,token,sid,pred,seconds=1.5):
    end=time.time()+seconds; last=None
    while time.time()<end:
        code,last=req(port,origin,token,sid,'POST','/v1/status','')
        if code==200 and pred(last): return last
        time.sleep(0.02)
    return last

p=subprocess.Popen([str(BIN),'--sidecar-null'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,bufsize=1)
ready=json.loads(p.stdout.readline())
if ready.get('type')!='sidecar-ready':
    p.kill(); raise SystemExit(f'bad ready: {ready}')
port=int(ready['port']); origin=ready['origin']; token_a=ready['token']; sid_a=ready['sessionId']; owner=int(ready['ownerEpoch']); lease_ms=int(ready.get('controlLeaseMs',0)); checks={}
try:
    checks['leasesAreDistinct']=int(ready.get('rtOwnerLeaseMs',0))>0 and lease_ms>int(ready.get('rtOwnerLeaseMs',0))
    code,s0=req(port,origin,token_a,sid_a); checks['sessionAInitiallyValid']=code==200 and int(s0.get('ownerClosed',1))==0
    code,hb=req(port,origin,token_a,sid_a,'POST','/v1/heartbeat',''); checks['browserHeartbeatAccepted']=code==200 and hb.get('scope')=='browser-control-session'
    code,before=req(port,origin,token_a,sid_a); checks['baselineStatus']=code==200
    frame_before=int(before.get('frame',0)); callbacks_before=int(before.get('callbacks',0)); renew_before=int(before.get('ownerLeaseRenewals',0))
    # Intentionally provide no browser heartbeat for longer than the browser-control lease.
    time.sleep((lease_ms+300)/1000.0)
    code,expired=req(port,origin,token_a,sid_a); checks['expiredBrowserSessionRejected']=code==403 and expired.get('error')=='control-session-expired'
    # A new browser session is issued by the still-live sidecar. RT ownership must remain the same.
    code,b=req(port,origin,method='GET',path='/v1/session',auth=False); checks['newBrowserSessionIssued']=code==200 and b.get('sessionId') and b.get('sessionId')!=sid_a and b.get('token') and b.get('token')!=token_a
    token_b=str(b.get('token','')); sid_b=str(b.get('sessionId',''))
    checks['rtOwnerEpochStable']=int(b.get('ownerEpoch',0))==owner
    code,after=req(port,origin,token_b,sid_b); checks['newSessionStatus']=code==200
    checks['rtOwnerSurvivedBrowserExpiry']=int(after.get('ownerClosed',1))==0
    checks['engineAdvancedWithoutBrowser']=int(after.get('frame',0))>frame_before and int(after.get('callbacks',0))>callbacks_before
    checks['sidecarRenewedRtLease']=int(after.get('ownerLeaseRenewals',0))>renew_before
    checks['browserExpiryObserved']=int(after.get('browserSessionExpirations',0))>=1
    code,_=req(port,origin,token_a,sid_a); checks['oldSessionStillRejectedAfterRotation']=code==403
    started=int(after.get('transportStarted',0)); source=int(after.get('frame',0))
    code,_=req(port,origin,token_b,sid_b,'POST','/v1/attack',f'sequence=900&sourceFrame={source}&slot=77&generation=1&frequency=440&peak=0.02'); checks['freshAttackAcceptedByNewSession']=code==202
    live=wait_status(port,origin,token_b,sid_b,lambda s:int(s.get('transportStarted',0))>=started+1); checks['freshAttackStartedAfterBrowserRotation']=bool(live and int(live.get('transportStarted',0))>=started+1 and int(live.get('ownerClosed',1))==0)
    code,_=req(port,origin,token_b,sid_b,'POST','/v1/shutdown',''); checks['shutdownAccepted']=code==200
finally:
    try:p.wait(timeout=3)
    except subprocess.TimeoutExpired:p.kill();p.wait()
    stderr=p.stderr.read().strip() if p.stderr else ''
passed=all(checks.values()) and p.returncode==0
obj={'pass':passed,'claim':'browser-session-lease-separated-from-rt-owner-lease','checks':checks,'controlLeaseMs':lease_ms,'rtOwnerLeaseMs':int(ready.get('rtOwnerLeaseMs',0)),'ownerEpoch':owner,'processExit':p.returncode,'stderr':stderr}
OUT.write_text(json.dumps(obj,indent=2,sort_keys=True)+'\n')
print(json.dumps(obj,separators=(',',':')))
sys.exit(0 if passed else 4)
