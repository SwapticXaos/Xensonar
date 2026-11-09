#!/usr/bin/env python3
"""Replay the historical 78 commands, preserving their original expected reds."""
from pathlib import Path
import hashlib,json,os,subprocess,sys,time
root=Path(__file__).resolve().parents[1]
baseline=json.loads((root/'docs/abc-legacy-regression/results.json').read_text())
out=root/os.environ.get('XEN_LEGACY_DIR','docs/bass-carrier-legacy-regression');out.mkdir(parents=True,exist_ok=True)
rows=[]
for i,previous in enumerate(baseline['gates']):
 command=[str(root) if v=='/mnt/data/xensonar_abc_work/XenSonar_A_B_C' else sys.executable if v.startswith('/opt/pyvenv/bin/python') else v for v in previous['command']]
 start=time.monotonic()
 try:
  p=subprocess.run(command,cwd=root,env={**os.environ,'XEN_HTML':str(root/'dist/XenSonar_Standalone.html')},capture_output=True,text=True,timeout=180)
  code=p.returncode;output=p.stdout+p.stderr
 except subprocess.TimeoutExpired:
  code=124;output='TIMEOUT after 180 seconds'
 log=f'{i:03}.log';(out/log).write_text(output)
 row={'command':command,'exit_code':code,'previous_exit_code':previous['exit_code'],'new_failure':bool(code and not previous['exit_code']),'seconds':round(time.monotonic()-start,3),'log':log}
 rows.append(row)
 print(('PASS' if not code else 'NEW FAIL' if row['new_failure'] else 'KNOWN FAIL')+' '+' '.join(command),flush=True)
 result={'html_sha256':hashlib.sha256((root/'dist/XenSonar_Standalone.html').read_bytes()).hexdigest(),'gates':rows,'passed':sum(not r['exit_code'] for r in rows),'failed':sum(bool(r['exit_code']) for r in rows),'new_failures':sum(r['new_failure'] for r in rows)}
 (out/'results.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='gates'}))
sys.exit(bool(result['new_failures']))
