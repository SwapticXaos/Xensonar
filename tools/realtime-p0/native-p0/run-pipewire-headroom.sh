#!/usr/bin/env bash
set -uo pipefail
export LC_ALL=C
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/artifacts"
mkdir -p "$OUT"
GATE="$OUT/P0N_PIPEWIRE_HEADROOM_GATE.json"
write_gate() {
  local status="$1" stage="$2" reason="$3" physical="$4"
  printf '{"status":"%s","stage":"%s","reason":"%s","n1Prerequisite":"frozen-336-physical-pass","physicalAudio":%s}\n' \
    "$status" "$stage" "$reason" "$physical" > "$GATE"
}

# 336 already supplied the physical N1 + concurrency evidence on this host.
# Here we only prove that the frozen musical/product substrates are unchanged.
if ! "$HERE/verify-336-n1-freeze.sh" > "$OUT/P0N_336_FREEZE_VERIFY_CONSOLE.txt"; then
  write_gate FAIL frozen-n1-integrity frozen-336-source-integrity-mismatch false
  cat "$GATE"
  exit 10
fi
if ! "$HERE/probe-pipewire-toolchain.sh" > "$OUT/P0N_PIPEWIRE_TOOLCHAIN.json"; then
  write_gate FAIL toolchain-probe pipewire-toolchain-probe-failed false
  cat "$GATE"
  exit 11
fi
if ! grep -q '"buildReady":true' "$OUT/P0N_PIPEWIRE_TOOLCHAIN.json"; then
  write_gate BLOCKED compile pipewire-development-toolchain-unavailable false
  cat "$GATE"
  exit 2
fi
if ! "$HERE/build-pipewire-headroom.sh"; then
  write_gate FAIL compile pipewire-headroom-build-failed false
  cat "$GATE"
  exit 12
fi
if ! grep -q '"physicalReady":true' "$OUT/P0N_PIPEWIRE_TOOLCHAIN.json"; then
  write_gate BLOCKED physical-runtime pipewire-server-socket-unavailable false
  cat "$GATE"
  exit 3
fi
if ! "$OUT/p0_native_physical_headroom" --pipewire-headroom | tee "$OUT/P0N_PIPEWIRE_PHYSICAL_HEADROOM.ndjson"; then
  write_gate FAIL headroom-run physical-headroom-scenario-failed true
  cat "$GATE"
  exit 13
fi
if ! "$HERE/validate-pipewire-headroom-evidence.py" \
  "$OUT/P0N_PIPEWIRE_PHYSICAL_HEADROOM.ndjson" \
  "$OUT/P0N_PIPEWIRE_PHYSICAL_HEADROOM_VALIDATION.json"; then
  write_gate FAIL evidence physical-headroom-evidence-validation-failed true
  cat "$GATE"
  exit 14
fi
write_gate PASS complete physical-pipewire-headroom-profile-pass true
cat "$GATE"
printf 'pipewire-headroom-pass %s\n' "$OUT/P0N_PIPEWIRE_PHYSICAL_HEADROOM.ndjson"
