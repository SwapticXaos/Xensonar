#!/usr/bin/env python3
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
s=(ROOT/'src/p0_native_host.c').read_text()
raw=['body-too-large','request-too-large','session-rotation-failed','bad-progress','forbidden-session','control-session-expired','bad-state','stale-revision','bad-attack','event-ring-full','bad-browser-report','not-found']
checks={
  'boundedHelper':'p0n_http_send_api_error' in s and 'char body[160]' in s,
  'noRawStableErrors':all(x not in s for x in raw),
  'manifestErrorsUsed':all(('P0N_ERROR_'+name) in s for name in ['BODY_TOO_LARGE','REQUEST_TOO_LARGE','SESSION_ROTATION_FAILED','BAD_PROGRESS','FORBIDDEN_SESSION','CONTROL_SESSION_EXPIRED','BAD_STATE','STALE_REVISION','BAD_ATTACK','EVENT_RING_FULL','BAD_BROWSER_REPORT','NOT_FOUND'])
}
out={'pass':all(checks.values()),'checks':checks,'claim':'sidecar-error-response-contract'}
print(json.dumps(out,separators=(',',':')))
raise SystemExit(0 if out['pass'] else 4)
