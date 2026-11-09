#!/usr/bin/env bash
set -uo pipefail
export LC_ALL=C
HERE="$(cd "$(dirname "$0")" && pwd)"; OUT="$HERE/artifacts"; mkdir -p "$OUT"
GATE="$OUT/P0N_PIPEWIRE_BROWSER_LAB_GATE.json"; PROBE="$OUT/P0N_PIPEWIRE_TOOLCHAIN.json"
write_gate(){ printf '{"status":"%s","stage":"%s","reason":"%s","sidecarPrerequisite":%s,"pipewireBuild":%s,"physicalAudio":%s,"browserExecuted":%s}\n' "$1" "$2" "$3" "$4" "$5" "$6" "$7" > "$GATE"; cat "$GATE"; }
if ! "$HERE/verify-340-sidecar-freeze.sh" > "$OUT/P0N_340_SIDECAR_FREEZE_CONSOLE.json"; then write_gate FAIL prerequisite sidecar-340-freeze-failed false false false false; exit 10; fi
"$HERE/probe-pipewire-toolchain.sh" > "$PROBE"
ready="$(python3 - "$PROBE" <<'PY'
import json,sys; print('true' if json.load(open(sys.argv[1])).get('physicalReady') else 'false')
PY
)"
if [[ "$ready" != true ]]; then write_gate BLOCKED environment pipewire-physical-environment-unavailable true false false false; exit 20; fi
if ! command -v firefox >/dev/null 2>&1 && ! command -v chromium >/dev/null 2>&1 && ! command -v chromium-browser >/dev/null 2>&1 && ! command -v google-chrome >/dev/null 2>&1 && ! command -v google-chrome-stable >/dev/null 2>&1 && ! command -v opera >/dev/null 2>&1 && ! command -v opera-stable >/dev/null 2>&1; then write_gate BLOCKED browser browser-not-found true false true false; exit 21; fi
if ! "$HERE/build-pipewire-sidecar.sh"; then write_gate FAIL compile pipewire-sidecar-build-failed true false false false; exit 30; fi
if ! python3 "$HERE/tests/test_browser_lab.py" --physical --timeout 35 > "$OUT/P0N_BROWSER_LAB_PHYSICAL_CONSOLE.json"; then
  cat "$OUT/P0N_BROWSER_LAB_PHYSICAL_CONSOLE.json" >&2 || true
  write_gate FAIL browser browser-end-to-end-selftest-failed true true true true; exit 40
fi
if ! python3 "$HERE/validate-browser-lab-evidence.py" "$OUT/P0N_BROWSER_LAB_PHYSICAL_SELFTEST.json" "$OUT/P0N_BROWSER_LAB_PHYSICAL_VALIDATION.json"; then write_gate FAIL evidence browser-evidence-validation-failed true true true true; exit 50; fi
write_gate PASS complete physical-browser-sidecar-native-rt-pass true true true true
printf 'browser-lab-pass %s\n' "$OUT/P0N_BROWSER_LAB_PHYSICAL_SELFTEST.json"
