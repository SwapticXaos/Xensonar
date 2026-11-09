#!/usr/bin/env python3
import json, subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
m=json.loads((ROOT/'contracts/P0N_CONTROL_PROTOCOL.json').read_text())
checks={}
checks['version']=m.get('version')=='p0n-control-v1'
routes=m.get('routes',{}); headers=m.get('headers',{}); statuses=m.get('status',{}); errors=m.get('errors',{})
checks['routesUnique']=len(routes)==len(set(routes.values())) and len(routes)>=10
checks['routesLocalApi']=all(v.startswith('/') for v in routes.values())
checks['identityHeaders']=headers.get('token')=='X-Xensonar-Token' and headers.get('session')=='X-Xensonar-Session'
checks['statusSemantics']=statuses.get('ok')==200 and statuses.get('accepted')==202 and statuses.get('conflict')==409 and statuses.get('tooManyRequests')==429
checks['errorIdsUnique']=len(errors)==len(set(errors.values()))
checks['generatedInSync']=subprocess.run([str(ROOT/'generate-control-protocol.py'),'--check']).returncode==0
out={'pass':all(checks.values()),'checks':checks,'routeCount':len(routes),'errorCount':len(errors),'claim':'native-control-protocol-manifest-contract'}
print(json.dumps(out,separators=(',',':')))
raise SystemExit(0 if out['pass'] else 4)
