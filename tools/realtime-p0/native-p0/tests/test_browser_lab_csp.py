#!/usr/bin/env python3
import http.client, json, subprocess, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BIN=ROOT/'artifacts'/'p0_native_null_host'
OUT=ROOT/'artifacts'/'P0N_BROWSER_LAB_CSP_TEST.json'
p=subprocess.Popen([str(BIN),'--sidecar-null'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,bufsize=1)
try:
    ready=json.loads(p.stdout.readline()); port=int(ready['port']); origin=ready['origin']; token=ready['token']; session_id=ready['sessionId']
    c=http.client.HTTPConnection('127.0.0.1',port,timeout=2)
    c.request('GET','/lab'); r=c.getresponse(); body=r.read().decode('utf-8'); headers={k.lower():v for k,v in r.getheaders()}; code=r.status; c.close()
    csp=headers.get('content-security-policy','')
    def get_asset(path):
      cc=http.client.HTTPConnection('127.0.0.1',port,timeout=2)
      cc.request('GET',path); rr=cc.getresponse(); bb=rr.read().decode('utf-8'); hh={k.lower():v for k,v in rr.getheaders()}; status=rr.status; cc.close()
      return status,bb,hh
    protocol_code,protocol_body,protocol_headers=get_asset('/xensonar-native-protocol.js')
    adapter_code,adapter_body,adapter_headers=get_asset('/xensonar-native-control.js')
    checks={
      'lab200':code==200,
      'labBody': 'Xensonar Native Browser Lab' in body,
      'scriptSelfAllowed': "script-src 'self' 'unsafe-inline'" in csp,
      'connectSelfAllowed': "connect-src 'self'" in csp,
      'protocolReferenced': 'src="/xensonar-native-protocol.js"' in body,
      'adapterReferenced': 'src="/xensonar-native-control.js"' in body,
      'protocolAsset200': protocol_code==200 and 'XensonarNativeProtocol' in protocol_body,
      'adapterAsset200': adapter_code==200 and 'XensonarNativeControl' in adapter_body,
      'browserAssetsNoStore': protocol_headers.get('cache-control')=='no-store' and adapter_headers.get('cache-control')=='no-store',
      'browserAssetsSameOrigin': protocol_headers.get('cross-origin-resource-policy')=='same-origin' and adapter_headers.get('cross-origin-resource-policy')=='same-origin',
    }
    # clean shutdown via authenticated same-origin request
    payload=b''
    c=http.client.HTTPConnection('127.0.0.1',port,timeout=2)
    c.request('POST','/v1/shutdown',body=payload,headers={'Origin':origin,'X-Xensonar-Token':token,'X-Xensonar-Session':session_id,'Content-Type':'application/x-www-form-urlencoded','Content-Length':'0'})
    rr=c.getresponse(); rr.read(); c.close(); checks['shutdownAccepted']=rr.status==200
    p.wait(timeout=3); checks['exitClean']=p.returncode==0
    result={'pass':all(checks.values()),'checks':checks,'csp':csp}
except Exception as e:
    try:p.kill()
    except Exception:pass
    result={'pass':False,'error':str(e)}
OUT.write_text(json.dumps(result,indent=2,sort_keys=True)+'\n')
print(json.dumps(result,separators=(',',':')))
sys.exit(0 if result.get('pass') else 4)
