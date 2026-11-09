#!/usr/bin/env bash
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/artifacts"
mkdir -p "$OUT"
GATE="$OUT/P0N_PIPEWIRE_SIDECAR_GATE.json"
PROBE="$OUT/P0N_PIPEWIRE_TOOLCHAIN.json"
"$HERE/probe-pipewire-toolchain.sh" > "$PROBE"
write_gate(){ printf '{"status":"%s","stage":"%s","reason":"%s","headroomPrerequisite":%s,"pipewireBuild":%s,"physicalAudio":%s}\n' "$1" "$2" "$3" "$4" "$5" "$6" > "$GATE"; cat "$GATE"; }
if ! "$HERE/verify-338-headroom-freeze.sh" >/dev/null 2>&1; then write_gate FAIL prerequisite headroom-freeze-verification-failed false false false; exit 10; fi
physical_ready="$(python3 - "$PROBE" <<'PY'
import json,sys
j=json.load(open(sys.argv[1])); print('true' if j.get('physicalReady') else 'false')
PY
)"
if [[ "$physical_ready" != true ]]; then write_gate BLOCKED environment pipewire-physical-environment-unavailable true false false; exit 20; fi
if ! "$HERE/build-pipewire-sidecar.sh"; then write_gate FAIL compile pipewire-sidecar-build-failed true false false; exit 30; fi
if ! python3 "$HERE/tests/test_localhost_sidecar.py" --physical > "$OUT/P0N_SIDECAR_PHYSICAL_CONSOLE.json"; then
  cat "$OUT/P0N_SIDECAR_PHYSICAL_CONSOLE.json" >&2 || true
  write_gate FAIL physical-sidecar physical-sidecar-selftest-failed true true true; exit 40
fi
if ! python3 "$HERE/validate-sidecar-evidence.py" --physical "$OUT/P0N_SIDECAR_PHYSICAL_SELFTEST.json" "$OUT/P0N_SIDECAR_PHYSICAL_VALIDATION.json"; then
  write_gate FAIL evidence physical-sidecar-evidence-validation-failed true true true; exit 50
fi
write_gate PASS complete physical-pipewire-localhost-sidecar-pass true true true
printf 'pipewire-sidecar-pass %s\n' "$OUT/P0N_SIDECAR_PHYSICAL_SELFTEST.json"
