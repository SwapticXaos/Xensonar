#!/usr/bin/env python3
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4]
plan=(ROOT/'src/features/xensonar/audio/waveStarterHoldRenderPlan.ts').read_text()
worklet=(ROOT/'src/features/xensonar/audio/waveStarterWorkletPilotProcessorSource.ts').read_text()
checks={
 'canonical_plan_exists':'resolveWaveStarterHoldRenderPlan' in plan,
 'triangle_preserved':"WAVE_STARTER_HOLD_WAVEFORM = 'triangle'" in plan and '${WAVE_STARTER_HOLD_WAVEFORM}' in worklet,
 'gain_bounds_shared':'${WAVE_STARTER_HOLD_GAIN_MIN}' in worklet and '${WAVE_STARTER_HOLD_GAIN_MAX}' in worklet and '${WAVE_STARTER_HOLD_GAIN_FALLBACK}' in worklet,
 'normal_duration_shared':'${WAVE_STARTER_HOLD_NORMAL_DURATION_RATIO}' in worklet and '${WAVE_STARTER_HOLD_NORMAL_DURATION_MIN_SEC}' in worklet and '${WAVE_STARTER_HOLD_NORMAL_DURATION_MAX_SEC}' in worklet,
 'extend_duration_shared':'${WAVE_STARTER_HOLD_EXTEND_DURATION_RATIO}' in worklet and '${WAVE_STARTER_HOLD_EXTEND_DURATION_MIN_SEC}' in worklet and '${WAVE_STARTER_HOLD_EXTEND_DURATION_MAX_SEC}' in worklet,
 'prominence_shared':'${WAVE_STARTER_HOLD_EXTEND_PROMINENCE}' in worklet and '${WAVE_STARTER_HOLD_NORMAL_PROMINENCE}' in worklet,
 'old_magic_duration_removed':'Math.min(0.42, Math.max(0.09' not in worklet and 'Math.min(0.24, Math.max(0.045' not in worklet,
}
result={'pass':all(checks.values()),'claim':'hold-worklet-render-semantics-canonicalized-without-behavior-change','checks':checks,'nativeRendererImplemented':False,'physicalAudio':False}
print(json.dumps(result,indent=2,sort_keys=True))
raise SystemExit(0 if result['pass'] else 1)
