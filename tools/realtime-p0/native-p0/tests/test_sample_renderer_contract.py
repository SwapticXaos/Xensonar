#!/usr/bin/env python3
import json, subprocess
from pathlib import Path
HERE=Path(__file__).resolve().parent
OUT=HERE.parent/'artifacts'/'test_sample_renderer_core'
cp=subprocess.run(['cc','-O2','-std=c11','-Wall','-Wextra','-Werror',str(HERE/'test_sample_renderer.c'),'-lm','-o',str(OUT)],text=True,capture_output=True)
if cp.returncode:
 print(json.dumps({'pass':False,'stage':'compile','stderr':cp.stderr},indent=2));raise SystemExit(1)
r=subprocess.run([str(OUT)],text=True,capture_output=True)
try: payload=json.loads(r.stdout)
except Exception: payload={'pass':False,'stage':'parse','stdout':r.stdout,'stderr':r.stderr}
payload['claim']='native-one-shot-core-immutable-pcm-bank-and-bounded-voice-renderer'
payload['productWiring']=False
payload['physicalAudio']=False
print(json.dumps(payload,indent=2,sort_keys=True))
raise SystemExit(0 if r.returncode==0 and payload.get('pass') else 1)
