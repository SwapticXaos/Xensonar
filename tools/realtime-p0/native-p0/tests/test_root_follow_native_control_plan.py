#!/usr/bin/env python3
from pathlib import Path
import json, re, subprocess, tempfile, sys
ROOT=Path(__file__).resolve().parents[4]
SRC=ROOT/'src/features/xensonar/rootFollow/rootFollowNativeControlPlan.ts'
s=SRC.read_text()
checks={
 'noWebAudioObjects': not re.search(r'\b(AudioContext|AudioNode|GainNode|AudioBufferSourceNode|OscillatorNode|BiquadFilterNode|AudioParam)\b',s),
 'programStateLifecycleSeparated': all(x in s for x in ['RootFollowNativeProgramV1','RootFollowNativeRealtimeStateV1','RootFollowNativeLifecycleCommandV1']),
 'materialSynthDistinct': all(x in s for x in ["kind: 'material'","kind: 'synth-direct'",'missing-synth-pattern','missing-material-plan']),
 'boundedProgramLimits': all(x in s for x in ['maxTracks: 16','maxNotes: 512','maxCompiledCurvePointsPerNote: 512','maxImpulsePatternSteps: 64','maxLoopDurationSec: 600']),
 'oversizeRejectsNotTruncates': all(x in s for x in ['too-many-tracks','too-many-notes','gain-curve-too-large','pitch-curve-too-large','impulse-pattern-too-large']),
 'outputTopologyPreserved': "masterRole: 'rhythm'" in s and "auxDomains: ['forge']" in s,
 'rootLatestStateBounded': all(x in s for x in ['sourceFrame: number','rootHz: Math.max(27.5, Math.min(3520, args.rootHz))','volume: Math.max(0, Math.min(1, args.volume))']),
 'stopSeparateFromStaleAttackPolicy': "type: 'stop-program'" in s and "type: 'panic'" in s,
}
# Targeted TS compile using the repository's existing type environment. No emit.
cmd=['tsc','--noEmit','--skipLibCheck','--target','ES2020','--module','ESNext','--moduleResolution','Bundler','--lib','ES2020,DOM',str(SRC)]
p=subprocess.run(cmd,cwd=ROOT,text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
checks['targetedTypeScriptCompile']=p.returncode==0
failed=[k for k,v in checks.items() if not v]
out={'schema':'xensonar-root-follow-native-control-plan-contract-v1','pass':not failed,'checks':checks,'failed':failed,'tscStderr':p.stderr[-3000:]}
print(json.dumps(out,separators=(',',':')))
sys.exit(0 if not failed else 1)
