#!/usr/bin/env python3
import http.client, json, subprocess, sys, time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BIN=ROOT/'artifacts'/'p0_native_null_host'
OUT=ROOT/'artifacts'/'P0N_BROWSER_LAB_PROTOCOL_SELFTEST.json'

SESSION_ID=''
def request(port, method, path, token=None, origin=None, body=''):
    h={}
    if token is not None:
        h['X-Xensonar-Token']=token
        if SESSION_ID: h['X-Xensonar-Session']=SESSION_ID
    if origin is not None: h['Origin']=origin
    payload=body.encode() if body is not None else None
    if payload is not None:
        h['Content-Type']='application/x-www-form-urlencoded'; h['Content-Length']=str(len(payload))
    c=http.client.HTTPConnection('127.0.0.1',port,timeout=2)
    c.request(method,path,body=payload,headers=h); r=c.getresponse(); data=r.read().decode(); code=r.status;c.close()
    try:data=json.loads(data)
    except Exception:pass
    return code,data
p=subprocess.Popen([str(BIN),'--sidecar-null'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,bufsize=1)
ready=json.loads(p.stdout.readline());port=ready['port'];origin=ready['origin'];token=ready['token'];SESSION_ID=ready.get('sessionId','');checks={}
checks['readySessionIdentity']=bool(SESSION_ID) and int(ready.get('ownerEpoch',0))>0
code,lab=request(port,'GET','/lab',body=None);checks['labServed']=code==200 and 'Xensonar Native Browser Lab' in lab
code,adapter=request(port,'GET','/xensonar-native-control.js',body=None);checks['adapterServed']=code==200 and 'class XensonarNativeControl' in adapter and 'sourceFrameAt' in adapter
code,ses=request(port,'GET','/v1/session',body=None);checks['sessionServed']=code==200 and ses.get('token')==token and ses.get('sampleRate')==48000 and ses.get('sessionId')==SESSION_ID and int(ses.get('ownerEpoch',0))==int(ready.get('ownerEpoch',0))
code,st=request(port,'POST','/v1/status',token,origin,'');checks['postStatus']=code==200 and st.get('ok') is True and st.get('sessionId')==SESSION_ID
code,_=request(port,'POST','/v1/browser-progress',None,origin,'stage=10');checks['progressAccepted']=code==200
code,st=request(port,'POST','/v1/status',token,origin,'');checks['progressPublished']=code==200 and st.get('browserProgressStage')==10 and st.get('browserProgressCount')>=1
code,_=request(port,'POST','/v1/browser-report',token,origin,'pass=1&checks=14&failed=0&clockRttUs=1200&finalRevision=116');checks['reportAccepted']=code==200
code,st=request(port,'POST','/v1/status',token,origin,'');checks['reportPublished']=code==200 and st.get('browserReportSeen')==1 and st.get('browserReportPass')==1 and st.get('browserReportChecks')==14 and st.get('browserReportFailed')==0 and st.get('browserClockRttUs')==1200 and st.get('browserFinalRevision')==116
code,_=request(port,'POST','/v1/shutdown',token,origin,'');checks['shutdown']=code==200
p.wait(timeout=3);rest=p.stdout.read();err=p.stderr.read();checks['exitClean']=p.returncode==0
passed=all(checks.values());obj={'pass':passed,'checks':checks,'ready':{k:v for k,v in ready.items() if k!='token'},'stderr':err,'stdoutTail':rest.splitlines()[-3:]}
OUT.write_text(json.dumps(obj,indent=2,sort_keys=True)+'\n');print(json.dumps(obj,separators=(',',':')));sys.exit(0 if passed else 4)
