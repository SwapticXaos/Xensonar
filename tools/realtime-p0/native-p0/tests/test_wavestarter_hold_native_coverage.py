#!/usr/bin/env python3
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[4]
files = {
    'app': ROOT/'src/App.tsx',
    'bridge': ROOT/'src/features/xensonar/input/waveStarterGestureLoopWorkletBridge.ts',
    'hold': ROOT/'src/features/xensonar/input/useWaveStarterHoldGestureLoopBridge.ts',
    'direct': ROOT/'src/features/xensonar/audio/waveStarter9061DirectContract.ts',
}
text = {k:p.read_text() for k,p in files.items()}
checks = {}
checks['hold_pulses_feed_playWaveStartSound'] = 'playWaveStartSound(freq, false, {' in text['hold']
checks['basic_hold_marks_9061_direct'] = 'legacy9061DirectGate: true' in text['bridge'] and 'if (!forceSustainExtend)' in text['bridge']
checks['basic_hold_does_not_require_modern_lane'] = "'legacy9061DirectGate'" not in text['direct'].split('WAVE_STARTER_MODERN_LANE_OPTION_KEYS',1)[1].split('] as const',1)[0]
checks['direct_preset_can_reach_native_pilot'] = 'if (nativeWaveStarterPilot.tryAttack({' in text['app'] and "if (options?.legacy9061DirectGate === true)" in text['app']
checks['sustain_extend_is_explicit_special_path'] = 'waveStarterGestureLoopWorkletBridge: true' in text['bridge'] and 'forceSustainExtend' in text['bridge'] and 'apostrophe-safe-extend' in text['bridge']
checks['special_path_still_modern_lane'] = "'waveStarterGestureLoopWorkletBridge'" in text['direct'] and "'waveStarterGestureLoopWorkletOnly'" in text['direct']
result = {
    'pass': all(checks.values()),
    'claim': 'wavestarter-hold-native-coverage-classification',
    'checks': checks,
    'coverage': {
        'basicSegmentPulses': 'native-capable-via-9061-direct-preset-route',
        'sustainExtendApostropheSpecial': 'gap-worklet-special-path-not-yet-native-product-renderer',
        'segmentClockOwner': 'browser-hold-segment-clock-currently',
    },
    'note': 'This is a structural ownership/coverage proof, not a physical-audio claim.',
}
print(json.dumps(result, indent=2, sort_keys=True))
raise SystemExit(0 if result['pass'] else 1)
