import json
from pathlib import Path
root=Path(__file__).resolve().parents[4]
app=(root/'src/App.tsx').read_text()
hook=(root/'src/features/xensonar/audio/useNativeWaveStarterPilot.ts').read_text()
checks={
 'entrophonDetectedBeforeNative': "const entrophonActive = isEntrophonWaveVoiceActive();" in app,
 'nativeOnlyClassicPreset': "selection.kind === 'preset' && !entrophonActive" in app,
 'sampleNoIntentionalSilenceBranch': "Sample presets are intentionally outside this pilot" not in app,
 'modernLaneNotForcedToNativeDirect': "Native pilot ownership is lane-wide" not in app and "requestWaveStarterLaneAttack(getWaveStarterLaneRuntimeBridgeDeps(), baseFreq, isSector, options);" in app,
 'rflNotOwnershipSwitch': "rootFollowActive: !!nParamsUI.rootFollowLoopActive" in app,
 'rflAcceptedTelemetry': 'rflAcceptedAttacks' in hook and 'RFL-on native attacks' in app,
 'soundIdentityTelemetry': 'soundId: selection.presetId' in app and 'lastSoundId' in hook,
}
out={'pass':all(checks.values()),'claim':'wave-starter-render-class-ownership','checks':checks}
print(json.dumps(out,separators=(',',':')))
raise SystemExit(0 if out['pass'] else 1)
