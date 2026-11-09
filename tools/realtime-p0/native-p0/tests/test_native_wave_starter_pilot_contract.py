#!/usr/bin/env python3
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[4]
app=(ROOT/'src/App.tsx').read_text()
hook=(ROOT/'src/features/xensonar/audio/useNativeWaveStarterPilot.ts').read_text()
host=(ROOT/'tools/realtime-p0/native-p0/src/p0_native_host.c').read_text()
checks={
 'queryGated': "nativeWaveStarter') === '1'" in hook,
 'physicalOwnerRequired': 'native sidecar is not a physical audio owner' in hook,
 'laneReservation': 'laneOwnedRef.current = true' in hook,
 'noLegacyAfterOwnedFailure': "state: 'owned-failed'" in hook and 'laneOwnedRef.current = true' in hook,
 'directResolvedPitch': 'frequencyHz: resolved.playbackFreq' in app,
 'directResolvedGain': 'volume: resolved.volume' in app,
 'samplesKeepExistingRendererUntilPorted': "selection.kind === 'preset' && !entrophonActive" in app and 'Sample presets are intentionally outside this pilot' not in app,
 'modernSpecialLaneKeepsExistingRenderer': 'Native pilot ownership is lane-wide' not in app and 'requestWaveStarterLaneAttack(getWaveStarterLaneRuntimeBridgeDeps(), baseFreq, isSector, options);' in app,
 'entrophonKeepsExistingRendererUntilPorted': 'const entrophonActive = isEntrophonWaveVoiceActive();' in app,
 'rflTelemetryPresent': 'rflAcceptedAttacks' in hook and 'rootFollowActive: !!nParamsUI.rootFollowLoopActive' in app,
 'panicPresent': 'nativeWaveStarterPilot.panic()' in app,
 'endPilotPresent': 'nativeWaveStarterPilot.endPilot()' in app,
 'appModeNoDemoProgram': 'run_sidecar_with_driver(driver,physical_audio,html,len,0)' in host,
 'labModeKeepsDemoProgram': 'run_sidecar_with_driver(p0n_create_null_driver(),0,NULL,0u,1)' in host,
 'sameOriginAppRoute': 'p0n_http_send_app_html' in host,
 'authenticatedControlTouchesIdleLease': 'p0n_sidecar_browser_session_touch(sc);' in host and 'browserControlRenewals' in host,
 'shutdownCanRecoverFreshSession': 'freshShutdownControl' in hook and 'never replay musical attacks/state' in hook,
}
result={'pass':all(checks.values()),'claim':'native-wave-starter-pilot-contract','checks':checks}
print(json.dumps(result,separators=(',',':')))
raise SystemExit(0 if result['pass'] else 1)
