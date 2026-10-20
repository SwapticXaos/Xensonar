#!/usr/bin/env python3
"""Portable, deliberately modest static acceptance gates for rebuilt P7 HTML.
Run: python3 tests_verify_final_contract.py ./XenSonar_Codex_Handoff_Through_08.html
This is not a hardware or audible-performance verification.
"""
from pathlib import Path
import sys,re,subprocess,hashlib,tempfile
s=Path(sys.argv[1]).read_text()
expected='bc0260682088a3a37a7bf9637d634b8027bc121b2546cb9b520a9760d94c002d'
actual=hashlib.sha256(s.encode('utf-8')).hexdigest()
assert actual==expected, 'Expected exact source-level reproduction of chat P7 HTML'
checks={
 'original Refucktor voice is transplanted':'function __xenRefucktorCreateDroneVoice(' in s,
 'Workbench wobble remains included':'__xenRefucktorStepCurve' in s,
 'Derived/linked grid exists':'__XenBassGrid' in s and 'Link to Other Grid' in s,
 'Bass-grid RFL quantization exists':'quantizeRFL' in s,
 'Keyboard foundation detachment exists':'__xenKeyboardFoundationDetach' in s,
 'Left Alt expression action':'e.code==="AltLeft"' in s,
 'Physical B expression action':'e.code==="KeyB"' in s,
 'Keyboard damping control':'setDampHoldActive' in s,
 'Power-off echo reset':'e.updateNParams({echoOn:false})' in s,
 'Drone Workbench persistence':'xensonar:refucktor-drone-workbench.v1' in s,
 'Forge navigator sample preview':'function __f333PreviewNavigatorSample' in s,
 'English grid hover':'Click: Open Grid Workbench' in s,
 'Legacy AltGr availability':'AltGr' in s,
}
for k,v in checks.items():
 print(('PASS' if v else 'FAIL'),k)
assert all(checks.values())
m=re.search(r'<script type="module" crossorigin>(.*?)</script>',s,re.S)
assert m,'module script not found'
with tempfile.TemporaryDirectory() as d:
 path=Path(d)/'xensonar.mjs';path.write_text(m.group(1))
 subprocess.run(['node','--check',str(path)],check=True)
print('PASS exact rebuilt HTML checksum + JavaScript module syntax +',len(checks),'scoped static checks')
