#!/usr/bin/env python3
import hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4]
EXPECTED={
 'src/features/l3lab/canonicalForge/canonicalPreviewMaterialElastic.ts':'7f348ab2462a4edcf30bab331494f5ed9c6fe361665791b6dae3bcededba2d73',
 'src/features/xensonar/rootFollow/rootFollowMaterialRenderPlan.ts':'86f4719e1345b0f46c8312a9aa698d9cb5e9d99edcd54db6d986641ae13004e0',
 'src/features/xensonar/rootFollow/rootFollowMicroCutSafety.ts':'843cf41873ba1e74376465b602cd5ef0361f1a3c22ee91e1c70e76f06283b863',
 'src/features/xensonar/rootFollow/rootFollowMaterialImpulseRasterRuntime.ts':'cad54c59b93a8535ba7806c45ae1f7230f3cdd45f85a309e0caff9fd3a0120aa',
}
checks={}
for rel,expected in EXPECTED.items():
 p=ROOT/rel; checks['sha256:'+rel]=p.is_file() and hashlib.sha256(p.read_bytes()).hexdigest()==expected
renderer=(ROOT/'src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts').read_text()
plan_positions=[i for i in range(len(renderer)) if renderer.startswith('buildRootFollowMaterialWindowRenderPlan({',i)]
queue_positions=[i for i in range(len(renderer)) if renderer.startswith('pendingNativeWindows.push({',i)]
submit_positions=[i for i in range(len(renderer)) if renderer.startswith('await tryNativeRootFollowMaterialWindows',i)]
checks['transportAfterCanonicalPlan']=len(plan_positions)>=2 and len(queue_positions)>=2 and len(submit_positions)>=2 and all(plan_positions[i]<queue_positions[i]<submit_positions[i] for i in range(2))
out={
 'schema':'xensonar-385-packaged-381-parity-proof-v2',
 'pass':all(checks.values()),
 'checks':checks,
 'historicalExactParity':{'cases':3,'comparedEvents':70,'status':'inherited from the physically-used 382 package; 385 keeps the proven pure planner core byte-identical'},
 'note':'385 changes only the post-plan transport/ownership seam. The historical 381 legacy-vs-plan comparison is not recomputed on the target machine.'
}
print(json.dumps(out,separators=(',',':')))
raise SystemExit(0 if out['pass'] else 1)
