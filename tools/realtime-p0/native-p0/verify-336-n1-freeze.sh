#!/usr/bin/env bash
set -euo pipefail
export LC_ALL=C
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
OUT="$HERE/artifacts"
mkdir -p "$OUT"
GATE="$OUT/P0N_336_FREEZE_VERIFICATION.json"
EXPECTED_SRC="8c5f5ba8176ecb44e6a59582a201fed0581f3ec2f02c4577164523124135cf1d"
EXPECTED_CORE="26ffa235455db92ce3a781c6ec96e2aa38670d79650c1c256b732fd857fcf98e"
EXPECTED_WASM="8add51d3875c0b4c5187b4ce8a581f03f3bc238b29b2f3277f05608e62809aa0"
EXPECTED_WORKLET="31248b6d2f8c594dd3fe94d4845a396d51c1f5bb5eb9a18954563391ae433a00"
ACTUAL_SRC="$(cd "$ROOT" && find src -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum | awk '{print $1}')"
ACTUAL_CORE="$(sha256sum "$ROOT/tools/realtime-p0/core/p0_core.c" | awk '{print $1}')"
ACTUAL_WASM="$(sha256sum "$ROOT/tools/realtime-p0/artifacts/p0_core.wasm" | awk '{print $1}')"
ACTUAL_WORKLET="$(sha256sum "$ROOT/tools/realtime-p0/worklet/p0-worklet.js" | awk '{print $1}')"
PASS=true
[[ "$ACTUAL_SRC" == "$EXPECTED_SRC" ]] || PASS=false
[[ "$ACTUAL_CORE" == "$EXPECTED_CORE" ]] || PASS=false
[[ "$ACTUAL_WASM" == "$EXPECTED_WASM" ]] || PASS=false
[[ "$ACTUAL_WORKLET" == "$EXPECTED_WORKLET" ]] || PASS=false
cat > "$GATE" <<JSON
{"status":"$([[ "$PASS" == true ]] && echo PASS || echo FAIL)","claim":"336-physical-n1-freeze-source-integrity","n1Evidence":"frozen-physical-pass-2026-09-21","productSrc":{"actual":"$ACTUAL_SRC","expected":"$EXPECTED_SRC"},"p0Core":{"actual":"$ACTUAL_CORE","expected":"$EXPECTED_CORE"},"p0Wasm":{"actual":"$ACTUAL_WASM","expected":"$EXPECTED_WASM"},"p0Worklet":{"actual":"$ACTUAL_WORKLET","expected":"$EXPECTED_WORKLET"}}
JSON
cat "$GATE"
[[ "$PASS" == true ]]
