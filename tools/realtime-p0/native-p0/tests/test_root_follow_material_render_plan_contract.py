#!/usr/bin/env python3
from pathlib import Path
import json, re, sys

NATIVE=Path(__file__).resolve().parents[1]
ROOT=NATIVE.parents[2]
plan=(ROOT/'src/features/xensonar/rootFollow/rootFollowMaterialRenderPlan.ts').read_text()
renderer=(ROOT/'src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts').read_text()
elastic=(ROOT/'src/features/l3lab/canonicalForge/canonicalPreviewMaterialElastic.ts').read_text()
c=(NATIVE/'src/p0_native_root_follow_material_renderer.h').read_text()
checks={}
checks['planVersioned']='ROOT_FOLLOW_MATERIAL_RENDER_PLAN_VERSION = 1' in plan
checks['flowingAndFragment']="'flowing' | 'fragment'" in plan and "mode: \"flowing\"" in renderer and "mode: \"fragment\"" in renderer
checks['rootSmoothingInPlan']='smoothRootFollowMaterialTargetHz' in plan and 'nextSmoothedRootHz' in plan
checks['anchorElasticInPlan']='describeMaterialElasticPitch' in plan and 'playbackRate: pitchInfo.elasticRate' in plan
checks['exactGrainPayload']='MaterialElasticSlicePlan' in plan and 'buildMaterialElasticSlicePlan' in plan
checks['browserExecutesPlan']=renderer.count('buildRootFollowMaterialWindowRenderPlan({') >= 2 and renderer.count('executeRootFollowMaterialWindowRenderPlan({') >= 2
checks['noLegacyFragmentScheduler']='function scheduleElasticPhaseWindow' not in renderer
checks['genericElasticSplit']='export function buildMaterialElasticSlicePlan' in elastic and 'export function executeMaterialElasticSlicePlan' in elastic and 'const plan = buildMaterialElasticSlicePlan({' in elastic
checks['routingPreserved']="masterRole: 'rhythm'" in plan and "auxDomains: ['forge']" in plan
checks['crisisMetadata']='lateGrainStrategy' in plan and 'staleWindowMs' in plan and 'densityScale' in plan
checks['impulseMetadata']='rootFollowWindowStartSec' in plan and 'clockInterpretation' in plan
checks['nativeBounded']=all(x in c for x in ['P0N_RFL_MATERIAL_MAX_GRAINS_PER_WINDOW 64u','P0N_RFL_MATERIAL_WINDOW_RING 32u','P0N_RFL_MATERIAL_MAX_BATCH_WINDOWS 8u','P0N_RFL_MATERIAL_MAX_VOICES 96u'])
forbidden=['malloc(', 'calloc(', 'realloc(', 'free(', 'pthread_mutex', 'cosf(', 'sinf(', 'powf(']
checks['nativeRtNoForbiddenWork']=not any(x in c for x in forbidden)
checks['nativeHannTable']='P0N_RFL_MATERIAL_HANN_POINTS 160u' in c and 'P0N_RFL_MATERIAL_HANN[' in c
checks['nativeStalePanic']='windows_stale' in c and 'p0n_rfl_material_panic' in c and 'submissions_rejected_terminal' in c
result={'pass':all(checks.values()),'checks':checks,'count':len(checks)}
print(json.dumps(result,separators=(',',':')))
sys.exit(0 if result['pass'] else 1)
