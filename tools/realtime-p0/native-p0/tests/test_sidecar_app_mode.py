#!/usr/bin/env python3
import json,subprocess,tempfile,time,urllib.request
from pathlib import Path
HERE=Path(__file__).resolve().parent
ROOT=HERE.parent
HOST=ROOT/'artifacts/p0_native_null_host'
with tempfile.TemporaryDirectory() as td:
    app=Path(td)/'app.html'; app.write_text('<!doctype html><title>xensonar pilot fixture</title>')
    p=subprocess.Popen([str(HOST),'--sidecar-app',str(app)],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    try:
        ready=None
        deadline=time.time()+3
        while time.time()<deadline:
            line=p.stdout.readline()
            if line and '"type":"sidecar-ready"' in line:
                ready=json.loads(line); break
        if not ready: raise RuntimeError('sidecar-ready missing')
        base=ready['origin']; headers={'X-Xensonar-Token':ready['token'],'X-Xensonar-Session':ready['sessionId'],'Origin':base,'Content-Type':'application/x-www-form-urlencoded'}
        req=urllib.request.Request(base+'/v1/status',data=b'',method='POST',headers=headers)
        status=json.loads(urllib.request.urlopen(req,timeout=2).read())
        body=urllib.request.urlopen(base+'/?nativeWaveStarter=1',timeout=2).read().decode()
        checks={'demoProgramDisabled':status.get('programStarts')==0,'appServedSameOrigin':'xensonar pilot fixture' in body}
        req=urllib.request.Request(base+'/v1/shutdown',data=b'',method='POST',headers=headers)
        urllib.request.urlopen(req,timeout=2).read()
        p.wait(timeout=3)
        result={'pass':all(checks.values()),'claim':'native-app-sidecar-mode','checks':checks,'programStarts':status.get('programStarts')}
        print(json.dumps(result,separators=(',',':')))
        raise SystemExit(0 if result['pass'] else 1)
    finally:
        if p.poll() is None: p.kill()
