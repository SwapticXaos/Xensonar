#!/usr/bin/env python3
"""Regression gate for the P1->P3->P5->P6->P7->P8->P9->P10 sidebranch.
No P2/P4, no synthetic success: each command is a process with an exit code.
"""
import subprocess,time,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
html='dist/XenSonar_Standalone.html'
gates=[
 ['node','tests/source_contract.cjs'],
 ['node','tests/test_eq_p5_honesty.cjs'],
 ['node','tests/test_eq_p6_budget_and_tool.cjs'],
 ['node','tests/test_eq_p6_contours.cjs'],
 ['node','tests/test_eq_p7_paint_budget.cjs'],
 ['node','tests/test_eq_p7_dsp_continuity.cjs'],
 ['node','tests/test_eq_p8_manual_band.cjs'],
 ['node','tests/eq_nailed3_paint_regression.cjs'],
 ['node','tests/eq_nailed3_dsp_budget.cjs'],
 ['node','tests/test_melodic_precision_r20.cjs'],
 ['python3','tests/test_eq_p10_morph_noop_browser.py',html],
 ['python3','tests/test_eq_p9_default_hand_browser.py',html],
 ['python3','tests/test_eq_p8_drag_browser.py',html],
 ['python3','tests/test_fastboot_eq_session_browser.py',html],
 ['python3','tests/test_p8_wheel_routes_regression.py',html],
]
results=[]
for command in gates:
 started=time.perf_counter()
 try:
  proc=subprocess.run(command,cwd=ROOT,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=85)
  result={'command':' '.join(command),'exit':proc.returncode,'durationSec':round(time.perf_counter()-started,2),'tail':proc.stdout[-1200:]}
 except subprocess.TimeoutExpired as exc:
  result={'command':' '.join(command),'exit':'TIMEOUT','durationSec':round(time.perf_counter()-started,2),'tail':str(exc)[-1200:]}
 results.append(result)
 print(('PASS' if result['exit']==0 else 'FAIL'),result['command'],f"{result['durationSec']}s",flush=True)
 if result['exit']!=0: print(result['tail']);break
out={'status':'GREEN' if len(results)==len(gates) and all(r['exit']==0 for r in results) else 'RED','gateCount':len(results),'expectedCount':len(gates),'gates':results}
(ROOT/'dist/P10_consolidation_testresults.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
print('P10 RESULT',out['status'],len(results),'/',len(gates))
sys.exit(0 if out['status']=='GREEN' else 1)
