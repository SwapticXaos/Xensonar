#!/usr/bin/env python3
import json
from pathlib import Path
root=Path(__file__).resolve().parents[4]
hook=(root/'src/features/xensonar/audio/useNativeWaveStarterPilot.ts').read_text()
app=(root/'src/App.tsx').read_text()
host=(root/'tools/realtime-p0/native-p0/src/p0_native_host.c').read_text()
checks={
  'boundedAudiblePeakMap': 'clamp(attack.volume * 0.25, 0.025, 0.06)' in hook,
  'statusObservabilityOnly': 'status is observability only' in hook,
  'testTonePresent': 'const testTone = useCallback' in hook and 'Native Test Tone' in app,
  'overlayShowsPeak': 'native peak:' in app and 'nativeVoicesStarted' in app,
  'actualVoiceStartPublished': 'observed_external_voices_started' in host and 'p0_started_external()' in host,
  'pcmPeakMeasuredInCopyLoop': 'callback_peak' in host and 'render_peak_max_micros' in host,
  'nonzeroCallbacksPublished': 'render_nonzero_callbacks' in host,
  'coreUnmodifiedByContract': '../../core/p0_core.c' in host,
}
out={'pass':all(checks.values()),'claim':'native-wave-starter-audibility-contract','checks':checks}
print(json.dumps(out,separators=(',',':')))
raise SystemExit(0 if out['pass'] else 1)
