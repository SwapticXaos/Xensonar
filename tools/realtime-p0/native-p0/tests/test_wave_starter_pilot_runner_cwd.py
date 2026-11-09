#!/usr/bin/env python3
import json, os, subprocess, tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4]
runner=ROOT/'RUN_NATIVE_WAVE_STARTER_PILOT_363.sh'
with tempfile.TemporaryDirectory(prefix='xensonar363-foreign-cwd.') as td:
    env=os.environ.copy(); env['XENSONAR_PILOT_PREFLIGHT_ONLY']='1'; env['HOME']=td
    p=subprocess.run(['bash',str(runner)],cwd=td,env=env,text=True,capture_output=True)
    # With no HOME/Downloads the runner intentionally falls back to the embedded project root.
    zips=sorted(ROOT.glob('Xensonar_363_NATIVE_WAVE_STARTER_PILOT_RESULT_*.zip'))
    checks={
      'runnerExitedZero':p.returncode==0,
      'foreignCwdWasUsed':Path(td).resolve()!=ROOT.resolve(),
      'resultZipProduced':len(zips)==1,
      'rootPackageLockExists':(ROOT/'package-lock.json').is_file(),
      'runnerPinsProjectRoot':'cd "$ROOT"' in runner.read_text(),
    }
    result={'pass':all(checks.values()),'claim':'native-wave-starter-pilot-runner-cwd-regression','checks':checks,'stdoutTail':p.stdout.splitlines()[-5:],'stderrTail':p.stderr.splitlines()[-5:]}
    print(json.dumps(result,separators=(',',':')))
    raise SystemExit(0 if result['pass'] else 1)
