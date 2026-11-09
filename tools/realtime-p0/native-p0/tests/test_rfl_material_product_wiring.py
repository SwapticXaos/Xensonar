#!/usr/bin/env python3
from pathlib import Path
import json,sys
ROOT=Path(__file__).resolve().parents[4]; N=Path(__file__).resolve().parents[1]
def read(p): return (ROOT/p).read_text()
checks={}
proto=json.loads((N/'contracts/P0N_CONTROL_PROTOCOL.json').read_text())
checks['dedicatedRoutes']=all(k in proto['routes'] for k in ['rflMaterialAsset','rflMaterialSubmit','rflMaterialBatch','rflMaterialStop'])
adapter=(N/'browser/p0_native_control_adapter.js').read_text()
checks['binaryAssetAndPlanBlocks']=all(x in adapter for x in ['rootFollowMaterialRegisterAsset','rootFollowMaterialSubmitWindow','rootFollowMaterialSubmitBatch','rootFollowMaterialStop','#postBinary'])
bridge=read('src/features/xensonar/rootFollow/useNativeRootFollowMaterialPilot.ts')
checks['coldStaysLegacy']="reason: 'asset-publishing'" in bridge and 'owned: false' in bridge
checks['noPrepareTimeoutFeedback']='prepare-timeout' not in bridge and 'rootFollowMaterialPrepareWindow(' not in bridge.split('const handleBatch',1)[-1]
checks['stickyOwnershipDropsInsteadOfLegacyFanout']='ownershipLatchedRef.current' in bridge and 'native-owned-drop-submit-reject' in bridge and 'native-owned-filter-drop' in bridge
checks['commitRecovery']='rflMaterialLastCommittedId' in bridge and 'native-owned-batch-recovered' in bridge
checks['batchBound']='requests.length > 8' in bridge and 'rootFollowMaterialSubmitBatch' in bridge
renderer=read('src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts')
checks['productPlansBeforeBatch']=renderer.count('pendingNativeWindows.push({')>=2 and renderer.count('tryNativeRootFollowMaterialWindows')>=2
checks['ownershipAtProductSeam']=renderer.count('if (nativeResult.owned)')==2 and renderer.count('executeNativeOwnedRootFollowForgeAux')>=2
checks['legacyOnlyBeforeNativeOwnership']=renderer.count('destination: legacyDestination')>=2
checks['forgePreserved']='native-rhythm+browser-forge-aux' in renderer
playback=read('src/features/xensonar/material/useRootFollowLoopPlayback.ts')
checks['materialAwaitOnly']='await scheduleRootFollowMaterialWindow' in playback and 'await scheduleRootFollowSynthWindow' in playback
runtime=read('src/features/xensonar/rootFollow/rootFollowRuntimeBoundary.ts')
checks['stopLifecycle']='stopNativeRootFollowMaterialBridge()' in runtime and 'disposeAllNativeRootFollowMaterialForgeAux()' in runtime
host=(N/'src/p0_native_host.c').read_text()
checks['sidecarExecutesNotReplans']=all(x in host for x in ['p0n_parse_rfl_material_batch','p0n_rfl_material_submit_windows','P0N_ROUTE_RFL_MATERIAL_BATCH']) and 'buildRootFollowMaterialWindowRenderPlan' not in host
checks['ackAfterQueuePublication']=host.index('p0n_rfl_material_submit_windows(&sc->engine->rfl_material,plans,count)') < host.index('"transport\\\":\\\"plan-batch\\\"')
checks['legacyCommitAckOrderFixed']=host.index('!p0n_rfl_material_submit_window(&sc->engine->rfl_material,&sc->prepared_material_window)') < host.index('char out[160];snprintf(out,sizeof(out),"{\\\"ok\\\":true,\\\"committedId')
failed=[k for k,v in checks.items() if not v]
print(json.dumps({'pass':not failed,'checks':checks,'failed':failed,'claim':'385-material-planblock-product-wiring-prephysical'},separators=(',',':')))
sys.exit(1 if failed else 0)
