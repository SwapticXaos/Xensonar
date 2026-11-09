#!/usr/bin/env python3
import http.client, json, subprocess, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BIN=ROOT/'artifacts'/'p0_native_null_host'
OUT=ROOT/'artifacts'/'P0N_SIDECAR_SESSION_LIFECYCLE.json'

def start():
    p=subprocess.Popen([str(BIN),'--sidecar-null'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,bufsize=1)
    line=p.stdout.readline().strip(); ready=json.loads(line)
    if ready.get('type')!='sidecar-ready':
        p.kill(); raise RuntimeError(f'bad ready: {ready}')
    return p,ready

def req(ready, token, session_id, method='POST', path='/v1/status', body=''):
    headers={'Origin':ready['origin'],'X-Xensonar-Token':token,'X-Xensonar-Session':session_id,'Content-Type':'application/x-www-form-urlencoded'}
    payload=body.encode(); headers['Content-Length']=str(len(payload))
    c=http.client.HTTPConnection('127.0.0.1',int(ready['port']),timeout=2)
    c.request(method,path,body=payload,headers=headers); r=c.getresponse(); data=r.read().decode(); code=r.status;c.close()
    try:data=json.loads(data)
    except Exception:pass
    return code,data

def stop(p,ready):
    code,_=req(ready,ready['token'],ready['sessionId'],'POST','/v1/shutdown','')
    p.wait(timeout=3)
    return code==200 and p.returncode==0

pa,a=start(); checks={}
try:
    checks['sessionAIdentity']=bool(a.get('sessionId')) and int(a.get('ownerEpoch',0))>0
    code,sa=req(a,a['token'],a['sessionId']); checks['sessionAStatus']=code==200 and sa.get('sessionId')==a['sessionId'] and int(sa.get('ownerEpoch',0))==int(a['ownerEpoch'])
finally:
    checks['sessionAShutdown']=stop(pa,a)

pb,b=start()
try:
    checks['sessionBIdentity']=bool(b.get('sessionId')) and int(b.get('ownerEpoch',0))>0
    checks['sessionIdRotated']=a['sessionId']!=b['sessionId']
    checks['tokenRotated']=a['token']!=b['token']
    code,_=req(b,a['token'],a['sessionId']); checks['oldPairRejected']=code==403
    code,_=req(b,b['token'],a['sessionId']); checks['newTokenOldSessionRejected']=code==403
    code,_=req(b,a['token'],b['sessionId']); checks['oldTokenNewSessionRejected']=code==403
    code,sb=req(b,b['token'],b['sessionId']); checks['newPairAccepted']=code==200 and sb.get('sessionId')==b['sessionId'] and int(sb.get('ownerEpoch',0))==int(b['ownerEpoch'])
finally:
    checks['sessionBShutdown']=stop(pb,b)
passed=all(checks.values())
obj={'pass':passed,'claim':'sidecar-session-identity-lifecycle','checks':checks,'sessionA':{'sessionId':a['sessionId'],'ownerEpoch':a['ownerEpoch']},'sessionB':{'sessionId':b['sessionId'],'ownerEpoch':b['ownerEpoch']}}
OUT.write_text(json.dumps(obj,indent=2,sort_keys=True)+'\n');print(json.dumps(obj,separators=(',',':')));sys.exit(0 if passed else 4)
