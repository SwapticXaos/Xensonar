#!/usr/bin/env python3
import http.client, json, math, os, struct, subprocess, time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
HOST=ROOT/'artifacts/p0_native_null_host'
p=subprocess.Popen([str(HOST),'--sidecar-null'],stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,bufsize=1)
ready=None
try:
    deadline=time.time()+5
    while time.time()<deadline:
        line=p.stdout.readline()
        if not line: continue
        try: obj=json.loads(line)
        except: continue
        if obj.get('type')=='sidecar-ready': ready=obj;break
    if not ready: raise RuntimeError('sidecar not ready')
    port=ready['port']; origin=ready['origin']
    def req(method,path,body=b'',headers=None,auth=True):
        c=http.client.HTTPConnection('127.0.0.1',port,timeout=3)
        h={'Origin':origin}
        if auth:
            h.update({'X-Xensonar-Token':token,'X-Xensonar-Session':sid})
        if headers: h.update(headers)
        c.request(method,path,body=body,headers=h)
        r=c.getresponse(); data=r.read(); c.close()
        try: parsed=json.loads(data or b'{}')
        except: parsed={'raw':data.decode(errors='replace')}
        return r.status,parsed
    c=http.client.HTTPConnection('127.0.0.1',port,timeout=3);c.request('GET','/v1/session');r=c.getresponse();sess=json.loads(r.read());c.close();token=sess['token'];sid=sess['sessionId']
    status0=req('POST','/v1/status')[1]; frame=int(status0['frame'])
    sr=48000; frames=48000; channels=2
    samples=[]
    for i in range(frames):
        v=0.22*math.sin(2*math.pi*173*i/sr)
        samples.extend((v,v*0.83))
    pcm=struct.pack('<%sf'%len(samples),*samples)
    ah={'Content-Type':'application/octet-stream','X-Xensonar-Material-Hash':'0123456789abcdef','X-Xensonar-Material-Frames':str(frames),'X-Xensonar-Material-Channels':str(channels),'X-Xensonar-Material-Sample-Rate':str(sr)}
    code,a1=req('POST','/v1/rfl/material/asset',pcm,ah); assert code in (200,202) and a1.get('warm') is True
    slot=int(a1['assetSlot'])
    code,a2=req('POST','/v1/rfl/material/asset',pcm,ah); assert code==200 and int(a2['assetSlot'])==slot and a2.get('existing') is True
    now=int(req('POST','/v1/status')[1]['frame']); seq=9001; gen=7; starts=[now+2048,now+3072,now+4096]
    header=struct.pack('<IIQIIQfIII',0x314c4652,1,seq,gen,slot,now+12000,0.09,len(starts),3,0)
    grains=b''.join(struct.pack('<QdfI',st,float(i*640),1.0,1600) for i,st in enumerate(starts))
    code,prep=req('POST','/v1/rfl/material/window/prepare',header+grains,{'Content-Type':'application/octet-stream'}); assert code==202 and prep.get('warm') is True
    pid=int(prep['preparedId'])
    code,commit=req('POST','/v1/rfl/material/window/commit',f'preparedId={pid}'.encode(),{'Content-Type':'application/x-www-form-urlencoded'}); assert code==202 and int(commit['committedId'])==pid
    time.sleep(0.18)
    st=req('POST','/v1/status')[1]
    checks={
      'assetPublished': int(st.get('rflMaterialAssetsPublished',0))>=1,
      'prepareAccepted': int(st.get('rflMaterialPrepareAccepted',0))>=1,
      'commitAccepted': int(st.get('rflMaterialCommitsAccepted',0))>=1,
      'windowAccepted': int(st.get('rflMaterialWindowsAccepted',0))>=1,
      'grainsStarted': int(st.get('rflMaterialGrainsStarted',0))>=3,
      'nonzeroPcm': int(st.get('rflMaterialNonzeroCallbacks',0))>0,
      'generationLive': int(st.get('rflMaterialGeneration',0))==gen,
    }
    now2=int(st['frame'])
    stale_header=struct.pack('<IIQIIQfIII',0x314c4652,1,9002,gen,slot,max(0,now2-1),0.09,1,3,0)
    stale_grain=struct.pack('<QdfI',now2+128,0.0,1.0,800)
    cst,_=req('POST','/v1/rfl/material/window/prepare',stale_header+stale_grain,{'Content-Type':'application/octet-stream'}); checks['stalePrepareRejected']=cst==409
    bad_header=struct.pack('<IIQIIQfIII',0x314c4652,1,9003,gen,3,now2+8000,0.09,1,3,0)
    bst,_=req('POST','/v1/rfl/material/window/prepare',bad_header+stale_grain,{'Content-Type':'application/octet-stream'}); checks['unknownAssetRejected']=bst==400
    code,_=req('POST','/v1/rfl/material/stop',f'generation={gen}'.encode(),{'Content-Type':'application/x-www-form-urlencoded'}); checks['stopAccepted']=code==200
    time.sleep(0.03); st2=req('POST','/v1/status')[1]; checks['stopTerminalForGeneration']=int(st2.get('rflMaterialGeneration',99))==0 and int(st2.get('rflMaterialActiveVoices',99))==0
    result={'pass':all(checks.values()),'checks':checks,'status':{k:st2.get(k) for k in ['rflMaterialAssetsPublished','rflMaterialPrepareAccepted','rflMaterialCommitsAccepted','rflMaterialCommitsRejected','rflMaterialWindowsAccepted','rflMaterialWindowsStale','rflMaterialGrainsStarted','rflMaterialNonzeroCallbacks','rflMaterialGeneration','processErrors']},'physicalAudio':False}
    print(json.dumps(result,separators=(',',':')))
    req('POST','/v1/shutdown',b'',{'Content-Type':'application/x-www-form-urlencoded'})
    if not result['pass']: raise SystemExit(1)
finally:
    try: p.wait(timeout=3)
    except: p.kill();p.wait()
