#!/usr/bin/env python3
import http.client, json, math, struct, subprocess, time
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
        if auth: h.update({'X-Xensonar-Token':token,'X-Xensonar-Session':sid})
        if headers: h.update(headers)
        c.request(method,path,body=body,headers=h)
        r=c.getresponse(); data=r.read(); status=r.status; c.close()
        try: parsed=json.loads(data or b'{}')
        except: parsed={'raw':data.decode(errors='replace')}
        return status,parsed
    c=http.client.HTTPConnection('127.0.0.1',port,timeout=3);c.request('GET','/v1/session');r=c.getresponse();sess=json.loads(r.read());c.close();token=sess['token'];sid=sess['sessionId']
    sr=48000; frames=48000; channels=2
    samples=[]
    for i in range(frames):
        v=0.20*math.sin(2*math.pi*173*i/sr)+0.04*math.sin(2*math.pi*431*i/sr)
        samples.extend((v,v*0.81))
    pcm=struct.pack('<%sf'%len(samples),*samples)
    ah={'Content-Type':'application/octet-stream','X-Xensonar-Material-Hash':'3853853853853853','X-Xensonar-Material-Frames':str(frames),'X-Xensonar-Material-Channels':str(channels),'X-Xensonar-Material-Sample-Rate':str(sr)}
    code,a=req('POST','/v1/rfl/material/asset',pcm,ah); assert code in (200,202) and a.get('warm') is True
    slot=int(a['assetSlot']); gen=385

    def window(seq,start,deadline,stale=False):
        grains=[]
        # Dense enough to exercise multiple simultaneous grain starts, while staying bounded.
        for k in range(5):
            grains.append(struct.pack('<QdfI',start+k*72,float(((seq*733+k*401)%42000)),1.0,1500))
        hdr=struct.pack('<IIQIIQfIII',0x314c4652,1,seq,gen,slot,deadline,0.075,5,3,0)
        return hdr+b''.join(grains)
    def batch(windows):
        return struct.pack('<IIII',0x324c4652,1,len(windows),0)+b''.join(windows)

    st0=req('POST','/v1/status')[1]; now=int(st0['frame'])
    base=now+4096
    windows=[window(10000+j,base+j*384,now+24000+j*384) for j in range(8)]
    code,ack=req('POST','/v1/rfl/material/window/batch',batch(windows),{'Content-Type':'application/octet-stream'})
    assert code==202 and int(ack.get('count',0))==8 and int(ack.get('committedThrough',0))==10007
    time.sleep(0.28)
    st=req('POST','/v1/status')[1]
    before_last=int(st.get('rflMaterialLastCommittedId',0))
    checks={
      'oneBatchAccepted': int(st.get('rflMaterialBatchesAccepted',0))==1,
      'eightWindowsSubmitted': int(st.get('rflMaterialSubmitsAccepted',0))==8,
      'preparePathUnused': int(st.get('rflMaterialPrepareAccepted',0))==0,
      'legacyCommitPathUnused': int(st.get('rflMaterialCommitsAccepted',0))==0,
      'windowsAccepted': int(st.get('rflMaterialWindowsAccepted',0))>=8,
      'grainsStarted': int(st.get('rflMaterialGrainsStarted',0))>=40,
      'nonzeroPcm': int(st.get('rflMaterialNonzeroCallbacks',0))>0,
      'noProcessErrors': int(st.get('processErrors',0))==0,
      'lastCommittedIsBatchTail': before_last==10007,
    }
    # Atomic reject proof: one stale member rejects the whole 2-window batch.
    now2=int(st['frame'])
    stale=window(10008,now2+1024,max(0,now2-1))
    future=window(10009,now2+2048,now2+12000)
    code,_=req('POST','/v1/rfl/material/window/batch',batch([stale,future]),{'Content-Type':'application/octet-stream'})
    checks['mixedStaleBatchRejected']=code==409
    st2=req('POST','/v1/status')[1]
    checks['rejectAtomicNoCommitAdvance']=int(st2.get('rflMaterialLastCommittedId',0))==before_last
    checks['batchRejectCounter']=int(st2.get('rflMaterialBatchesRejected',0))>=1
    checks['rejectedWindowsCounted']=int(st2.get('rflMaterialSubmitsRejected',0))>=2
    # Direct submit remains available for single-window chunks and ACKs only after queue publication.
    now3=int(st2['frame'])
    direct=window(10010,now3+3072,now3+14000)
    code,dack=req('POST','/v1/rfl/material/window/submit',direct,{'Content-Type':'application/octet-stream'})
    checks['directSubmitAccepted']=code==202 and int(dack.get('committedId',0))==10010
    st3=req('POST','/v1/status')[1]
    checks['directCommitVisibleImmediately']=int(st3.get('rflMaterialLastCommittedId',0))==10010 and int(st3.get('rflMaterialSubmitsAccepted',0))==9
    code,_=req('POST','/v1/rfl/material/stop',f'generation={gen}'.encode(),{'Content-Type':'application/x-www-form-urlencoded'}); checks['stopAccepted']=code==200
    result={'pass':all(checks.values()),'checks':checks,'transport':{'acceptedWindows':int(st3.get('rflMaterialSubmitsAccepted',0)),'acceptedBatches':int(st3.get('rflMaterialBatchesAccepted',0)),'rejectedBatches':int(st3.get('rflMaterialBatchesRejected',0))},'physicalAudio':False}
    print(json.dumps(result,separators=(',',':')))
    req('POST','/v1/shutdown',b'',{'Content-Type':'application/x-www-form-urlencoded'})
    if not result['pass']: raise SystemExit(1)
finally:
    try: p.wait(timeout=3)
    except: p.kill();p.wait()
