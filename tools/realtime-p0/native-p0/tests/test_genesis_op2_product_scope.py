#!/usr/bin/env python3
import hashlib,json
from pathlib import Path
OP2=Path(__file__).resolve().parents[4]
OP1=Path('/mnt/data/xensonar_op2/xensonar_op_workspace_portable/work/patient/Xensonar_388_GENESIS_IMPLANT_OP1')

def tree(root):
    return {p.relative_to(root).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in (root/'src').rglob('*') if p.is_file()}
a,b=tree(OP1),tree(OP2)
changed=[x for x in sorted(set(a)|set(b)) if a.get(x)!=b.get(x)]
expected={
 'src/features/xensonar/audio/useNativeWaveStarterPilot.ts',
 'src/features/xensonar/nativeImplant/waveStarterNativeCorePlan.ts',
}
plan=(OP2/'src/features/xensonar/nativeImplant/waveStarterNativeCorePlan.ts').read_text()
checks={
 'onlyTwoProductFilesChangedFromOp1':set(changed)==expected,
 'adapterPlanIsPureData':'AudioContext' not in plan and 'AudioNode' not in plan and 'createOscillator' not in plan and 'react' not in plan.lower(),
 'adapterUsesCanonicalTonePlanner':'buildWaveStarterPresetToneSpecs' in plan,
 'adapterLabelsLimitedParity':'parameter-plan-parity-core-v1' in plan,
 'adapterListsExcludedSemantics':all(x in plan for x in ('gradient-modulation','extra-overtone-layer','body-exciter','swell-reinforcement','entrophon','hold-worklet-special-path')),
}
out={'pass':all(checks.values()),'claim':'genesis-op2-product-amputation-scope-from-op1','checks':checks,'changed':changed}
print(json.dumps(out,separators=(',',':')))
raise SystemExit(0 if out['pass'] else 1)
