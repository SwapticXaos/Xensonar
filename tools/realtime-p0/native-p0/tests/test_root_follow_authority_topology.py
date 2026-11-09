#!/usr/bin/env python3
from pathlib import Path
import json, sys
ROOT=Path(__file__).resolve().parents[4]
NATIVE=Path(__file__).resolve().parents[1]
contract=json.loads((NATIVE/'contracts/RFL_AUTHORITY_TOPOLOGY.json').read_text())
checks={}

def read(rel): return (ROOT/rel).read_text()

def has(rel,*needles):
    s=read(rel); return all(n in s for n in needles)

playback='src/features/xensonar/material/useRootFollowLoopPlayback.ts'
material='src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts'
dirty='src/features/xensonar/rootFollow/rootFollowDirtyMaschine.ts'
gran='src/features/xensonar/rootFollow/rootFollowGranularWorkletRenderPlan.ts'
shadow='src/features/xensonar/rootFollow/rootFollowWorkletShadowBridge.ts'
voice='src/features/xensonar/rootFollow/rootFollowVoicePoolShadowRuntime.ts'
runtime='src/features/xensonar/rootFollow/rootFollowRuntimeBoundary.ts'

checks['schedulerOwnsGateAndTransport']=has(playback,
    'resolveRootFollowGateCloseReason', 'transportAnchor',
    'resolveRootFollowImpulseRasterSlotDecision', 'resolveEffectiveRootHzForWindow',
    'scheduleRootFollowMaterialWindow', 'scheduleRootFollowSynthWindow')
checks['schedulerUsesBoundedFutureTickNotCatchupLoop']=has(playback,
    'window.setTimeout', 'firstRootFollowSliceOnGridAtOrAfter')
checks['outputTopologyRhythmAndForge']=has(playback,
    'gain.connect(dynamicRefs.current.getRhythmBusRef.current(ctx))',
    'if (forgeSend) gain.connect(forgeSend)')
checks['materialRendererIsProductReference']=has(material,
    'export async function scheduleRootFollowMaterialWindow',
    'buildRootFollowMaterialWindowRenderPlan', 'executeRootFollowMaterialWindowRenderPlan',
    'tryNativeRootFollowMaterialWindow', 'if (nativeResult.owned)',
    'executeNativeOwnedRootFollowForgeAux')
checks['nativeOwnershipKeepsLegacyFallback']=has(material,
    'if (nativeResult.owned)', 'executeRootFollowMaterialWindowRenderPlan({ ctx, destination: legacyDestination')
checks['nativeOwnershipPreservesForgeAux']=has(material,
    "routing: 'native-rhythm+browser-forge-aux'", 'forgeSend: dynamicRefs.getForgeSendRef.current()')
checks['dirtyWalzeBedMutedByDefault']=has(material,
    'dirtyDrossel.drosselnWalzeBedOnly()', 'getElasticDestination()')
checks['dirtyWalzeFireNotCalledByDefaultProductPath']=('.feuern(' not in read(material) and 'feuern(' not in read(playback))
checks['dirtyWalzeHasFourCylindersAndCompressor']=has(dirty,
    'for (let i = 0; i < 4; i += 1)', 'createDynamicsCompressor()',
    'compressor.threshold.value = -14', 'compressor.ratio.value = 6')
checks['flowingDoesNotRecenterOnSourceOffsetDrift']=has(dirty,
    'if (next.mode === "flowing")', 'return false;',
    'Re-centering flowing on every poll reintroduces the old entry crackle.')
checks['workletPlanPreservesLegacy']=has(gran,
    'preservesLegacyMaterialPath: true', 'activeAudioPath: args.activeAudioPath === true')
checks['workletShadowDefaultsMuted']=has(gran,
    'activeAudioPath: false', 'preservesLegacyMaterialPath: true')
checks['shadowBridgeReportsLegacyPreservation']=has(shadow,
    'preservesLegacyMaterialPath: true', 'activeAudioPath: false')
checks['voicePoolShadowPreservesLegacy']=has(voice,
    'preservesLegacyPath: true', "'worklet-shadow-muted'")
checks['terminalStopDisposesWalzeAndNodes']=has(runtime,
    'disposeAllDirtyRootFollowWalzen()', 'refs.activeNodesRef.current.clear()',
    'refs.activeSynthVoicesRef.current.clear()')
checks['contractSeparatesProgramFromEvents']=('treat Root Follow as repeated one-shot attacks' in contract['nativeMigrationShape']['forbidden'])
checks['contractKeepsMaterialSynthDistinct']=('material and synth render classes remain distinct' in contract['nativeMigrationShape']['recommended'])

failed=[k for k,v in checks.items() if not v]
out={'schema':'xensonar-root-follow-authority-audit-v1','pass':not failed,'checks':checks,'failed':failed,
     'claim':'authority-and-migration-shape-only-no-native-audio-claim'}
print(json.dumps(out,separators=(',',':')))
sys.exit(0 if not failed else 1)
