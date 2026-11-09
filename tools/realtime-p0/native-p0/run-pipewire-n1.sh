#!/usr/bin/env bash
set -uo pipefail
export LC_ALL=C
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/artifacts"
mkdir -p "$OUT"
GATE="$OUT/P0N_PIPEWIRE_N1_GATE.json"
write_gate() {
  local status="$1" stage="$2" reason="$3" build="$4" physical="$5"
  printf '{"status":"%s","stage":"%s","reason":"%s","nativeGate":true,"pipewireBuild":%s,"physicalAudio":%s}\n' \
    "$status" "$stage" "$reason" "$build" "$physical" > "$GATE"
}

if ! "$HERE/validate-native-p0.sh"; then
  write_gate FAIL native-validation native-p0-validation-failed false false
  cat "$GATE"
  exit 10
fi

if ! "$HERE/probe-pipewire-toolchain.sh" > "$OUT/P0N_PIPEWIRE_TOOLCHAIN.json"; then
  write_gate FAIL toolchain-probe pipewire-toolchain-probe-failed false false
  cat "$GATE"
  exit 11
fi

if ! grep -q '"buildReady":true' "$OUT/P0N_PIPEWIRE_TOOLCHAIN.json"; then
  write_gate BLOCKED compile pipewire-development-toolchain-unavailable false false
  cat "$GATE"
  exit 2
fi

if ! "$HERE/build-pipewire-host.sh"; then
  write_gate FAIL compile pipewire-host-build-failed false false
  cat "$GATE"
  exit 12
fi

if ! grep -q '"physicalReady":true' "$OUT/P0N_PIPEWIRE_TOOLCHAIN.json"; then
  write_gate BLOCKED physical-runtime pipewire-server-socket-unavailable true false
  cat "$GATE"
  exit 3
fi

if ! "$OUT/p0_native_pipewire_host" --pipewire-lifecycle-selftest | tee "$OUT/P0N_PIPEWIRE_LIFECYCLE_PHYSICAL.ndjson"; then
  write_gate FAIL lifecycle pipewire-start-stop-restart-failed true true
  cat "$GATE"
  exit 13
fi
if ! grep -q '"type":"driver-lifecycle".*"pass":true.*"physicalAudio":true' "$OUT/P0N_PIPEWIRE_LIFECYCLE_PHYSICAL.ndjson"; then
  write_gate FAIL lifecycle pipewire-lifecycle-evidence-missing true true
  cat "$GATE"
  exit 14
fi

if ! "$OUT/p0_native_pipewire_host" --pipewire-selftest | tee "$OUT/P0N_PIPEWIRE_N1_PHYSICAL.ndjson"; then
  write_gate FAIL n1-stall pipewire-n1-stall-test-failed true true
  cat "$GATE"
  exit 15
fi
if ! "$HERE/validate-pipewire-n1-evidence.py" \
  "$OUT/P0N_PIPEWIRE_LIFECYCLE_PHYSICAL.ndjson" \
  "$OUT/P0N_PIPEWIRE_N1_PHYSICAL.ndjson" \
  "$OUT/P0N_PIPEWIRE_N1_EVIDENCE_VALIDATION.json"; then
  write_gate FAIL n1-evidence pipewire-n1-evidence-validation-failed true true
  cat "$GATE"
  exit 16
fi

write_gate PASS complete physical-pipewire-n1-pass true true
cat "$GATE"
printf 'pipewire-n1-pass %s\n' "$OUT/P0N_PIPEWIRE_N1_PHYSICAL.ndjson"
