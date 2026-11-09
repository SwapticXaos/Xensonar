#!/usr/bin/env python3
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4]
hook=(ROOT/'src/features/xensonar/audio/useNativeWaveStarterPilot.ts').read_text()
app=(ROOT/'src/App.tsx').read_text()
host=(ROOT/'tools/realtime-p0/native-p0/src/p0_native_host.c').read_text()
renderer=(ROOT/'tools/realtime-p0/native-p0/src/p0_native_wavestarter_renderer.h').read_text()
protocol=(ROOT/'tools/realtime-p0/native-p0/contracts/P0N_CONTROL_PROTOCOL.json').read_text()
toneplan=(ROOT/'src/features/xensonar/audio/waveStarterPresetTonePlan.ts').read_text()
checks={
 'productUsesDedicatedWaveStarterRoute':'control.waveStarterAttack({' in hook,
 'productCarriesPresetIdentity':'presetId: attack.soundId' in hook and 'soundId: selection.presetId' in app,
 'productCarriesResolvedPitch':'frequencyHz: attack.frequencyHz' in hook and 'frequencyHz: resolved.playbackFreq' in app,
 'productPeakBounded':'clamp(attack.volume * 0.35, 0.025, 0.12)' in hook,
 'p0TestToneRemainsReference':'control.attack({ slot, generation, frequencyHz: 440, peak: 0.08' in hook,
 'samplesRemainLegacy':'selection.kind === \'preset\' && !entrophonActive' in app,
 'entrophonRemainsLegacy':'const entrophonActive = isEntrophonWaveVoiceActive();' in app,
 'holdSpecialLaneRemainsLegacy':'requestWaveStarterLaneAttack(getWaveStarterLaneRuntimeBridgeDeps(), baseFreq, isSector, options);' in app,
 'sharedPresetManifestUsedByLegacy':'waveStarterSynthPresetManifest.json' in toneplan,
 'dedicatedProtocolRoute':'/v1/wavestarter/attack' in protocol,
 'hostUsesSiblingRenderer':'#include "p0_native_wavestarter_renderer.h"' in host and 'p0n_ws_render(&e->wave_starter' in host,
 'p0CoreStillSeparate':'../../core/p0_core.c' in host,
 'rtRendererFixedVoiceBank':'#define P0N_WS_MAX_VOICES 48u' in renderer,
 'rtRendererFixedRing':'#define P0N_WS_RING_CAPACITY 64u' in renderer,
 'rendererNoHeapTokens':all(tok not in renderer for tok in ('malloc(', 'calloc(', 'realloc(', 'free(')),
 'rendererNoMutexTokens':all(tok not in renderer for tok in ('pthread_mutex', 'mtx_', 'mutex')),
 'originalDeadlineFields':'source_frame' in renderer and 'latest_admission_frame' in renderer,
 'panicTerminal':'atomic_store_explicit(&r->terminal,1' in renderer,
 'rflStillTelemetryNotOwnership':'rootFollowActive: !!nParamsUI.rootFollowLoopActive' in app and 'rflAcceptedAttacks' in hook,
}
out={'pass':all(checks.values()),'claim':'native-wavestarter-synth-palette-v1-contract','checks':checks,'scope':{'nativeNow':['classic synth preset core/body v1'],'legacyForNow':['one-shot samples','Entrophon','hold/worklet special path'],'notClaimed':['gradient modulation','extra overtone layer','body exciter','swell reinforcement','full legacy parity']}}
print(json.dumps(out,separators=(',',':')))
raise SystemExit(0 if out['pass'] else 1)
