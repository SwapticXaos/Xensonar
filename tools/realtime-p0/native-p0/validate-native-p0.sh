#!/usr/bin/env bash
set -euo pipefail
export LC_ALL=C
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../../.." && pwd)"
OUT="$HERE/artifacts"
DEFAULT_SRC_TREE="8c5f5ba8176ecb44e6a59582a201fed0581f3ec2f02c4577164523124135cf1d"
EXPECTED_SRC_TREE="${P0N_EXPECTED_SRC_TREE:-$DEFAULT_SRC_TREE}"
PRODUCT_SRC_CLAIM="${P0N_PRODUCT_SRC_CLAIM:-frozen-product-oracle}"
if [[ "$EXPECTED_SRC_TREE" == "$DEFAULT_SRC_TREE" ]]; then FROZEN_PRODUCT_SRC=true; else FROZEN_PRODUCT_SRC=false; fi
EXPECTED_CORE="26ffa235455db92ce3a781c6ec96e2aa38670d79650c1c256b732fd857fcf98e"
EXPECTED_WASM="8add51d3875c0b4c5187b4ce8a581f03f3bc238b29b2f3277f05608e62809aa0"
EXPECTED_WORKLET="31248b6d2f8c594dd3fe94d4845a396d51c1f5bb5eb9a18954563391ae433a00"

sha_file() { sha256sum "$1" | awk '{print $1}'; }
src_tree_hash() {
  (cd "$ROOT" && find src -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum | awk '{print $1}')
}

[[ "$(src_tree_hash)" == "$EXPECTED_SRC_TREE" ]]
[[ "$(sha_file "$ROOT/tools/realtime-p0/core/p0_core.c")" == "$EXPECTED_CORE" ]]
[[ "$(sha_file "$ROOT/tools/realtime-p0/artifacts/p0_core.wasm")" == "$EXPECTED_WASM" ]]
[[ "$(sha_file "$ROOT/tools/realtime-p0/worklet/p0-worklet.js")" == "$EXPECTED_WORKLET" ]]

"$HERE/build-native-prep.sh"
"$HERE/run-native-tsan.sh"
"$HERE/run-native-driver-tsan.sh"
"$HERE/run-native-sanitizers.sh"
"$HERE/tests/test_pipewire_evidence_validator.sh"
"$HERE/tests/test_pipewire_1_0_5_compat_static.sh"
"$HERE/tests/test_pipewire_headroom_evidence_validator.sh"
python3 "$HERE/tests/test_control_protocol_manifest.py" > "$OUT/P0N_CONTROL_PROTOCOL_MANIFEST_TEST.json"
python3 "$HERE/tests/test_sidecar_error_response_contract.py" > "$OUT/P0N_SIDECAR_ERROR_RESPONSE_CONTRACT.json"
python3 "$HERE/tests/test_null_headroom_scope.py" > "$OUT/P0N_NULL_HEADROOM_SCOPE_TEST.json"
cc -O2 -std=c11 -Wall -Wextra -Werror "$HERE/tests/test_control_policy.c" -o "$OUT/test_control_policy"
"$OUT/test_control_policy" > "$OUT/P0N_CONTROL_POLICY_TEST.json"
node --check "$HERE/browser/p0_native_control_adapter.js"
node "$HERE/tests/test_browser_control_adapter.mjs" > "$OUT/P0N_BROWSER_CONTROL_ADAPTER_TEST.json"
python3 "$HERE/tests/test_sidecar_session_lifecycle.py" > "$OUT/P0N_SIDECAR_SESSION_LIFECYCLE_CONSOLE.json"
python3 "$HERE/tests/test_sidecar_lease_separation.py" > "$OUT/P0N_SIDECAR_LEASE_SEPARATION_CONSOLE.json"
python3 "$HERE/tests/test_sidecar_control_idle_lease.py" > "$OUT/P0N_SIDECAR_CONTROL_IDLE_LEASE_CONSOLE.json"
"$HERE/tests/test_browser_lab_csp.py" > "$OUT/P0N_BROWSER_LAB_CSP_CONSOLE.json"
"$HERE/validate-synthetic-headroom.py" "$OUT/P0N_SYNTHETIC_HEADROOM.json" > "$OUT/P0N_SYNTHETIC_HEADROOM_VALIDATION.json"

grep -q '"type":"selftest-end","pass":true' "$OUT/P0N_NULL_HOST_SELFTEST.ndjson"
grep -q '"type":"driver-lifecycle".*"pass":true' "$OUT/P0N_NULL_DRIVER_LIFECYCLE.ndjson"
grep -q '"type":"callback-quantum-512","pass":true' "$OUT/P0N_ADVERSARIAL_TRANSPORT_TEST.ndjson"
grep -q '"type":"stale-attack-500ms","pass":true' "$OUT/P0N_ADVERSARIAL_TRANSPORT_TEST.ndjson"
grep -q '"type":"fresh-after-stale","pass":true' "$OUT/P0N_ADVERSARIAL_TRANSPORT_TEST.ndjson"
grep -q '"type":"chord3-atomic","pass":true' "$OUT/P0N_ADVERSARIAL_TRANSPORT_TEST.ndjson"
grep -q '"type":"release-before-start","pass":true' "$OUT/P0N_ADVERSARIAL_TRANSPORT_TEST.ndjson"
grep -q '"type":"panic-no-resurrection","pass":true' "$OUT/P0N_ADVERSARIAL_TRANSPORT_TEST.ndjson"
grep -q '"type":"adversarial-end","pass":true' "$OUT/P0N_ADVERSARIAL_TRANSPORT_TEST.ndjson"
grep -q '"type":"signal-truth","pass":true' "$OUT/P0N_SIGNAL_TRUTH.ndjson"
grep -q '"routingPass":false' "$OUT/P0N_SIGNAL_TRUTH.ndjson"
grep -q '"concurrentSpscPass":true' "$OUT/P0N_NATIVE_TRANSPORT_TEST.json"
grep -q '"oldRevisionRejected":true' "$OUT/P0N_NATIVE_TRANSPORT_TEST.json"
grep -q '"stateAtomicsLockFree":true' "$OUT/P0N_NATIVE_TRANSPORT_TEST.json"
grep -q '"pass":true' "$OUT/P0N_NATIVE_TRANSPORT_TSAN.json"
grep -q '"type":"driver-concurrency".*"pass":true' "$OUT/P0N_NULL_DRIVER_TSAN.ndjson"
grep -q '"type":"driver-lifecycle".*"pass":true' "$OUT/P0N_NULL_DRIVER_LIFECYCLE_TSAN.ndjson"
grep -q '"type":"headroom-end".*"physicalAudio":false.*"pass":true' "$OUT/P0N_PHYSICAL_HEADROOM_NULL_SELFTEST.ndjson"

cat > "$OUT/P0N_NATIVE_VALIDATION_GATE.json" <<JSON
{"pass":true,"frozenProductSrc":$FROZEN_PRODUCT_SRC,"productSrcClaim":"$PRODUCT_SRC_CLAIM","frozenP0Core":true,"frozenP0Wasm":true,"frozenP0Worklet":true,"nullHost":true,"driverLifecycle":true,"adversarialCausality":true,"callback512Chunking":true,"concurrentSpsc":true,"c11Mailbox":true,"tsan":true,"driverTsan":true,"asanUbsan":true,"pipewireEvidenceValidator":true,"pipewire105StaticCompat":true,"syntheticHeadroomSchema":true,"renderSignalTruth":true,"physicalHeadroomHarness":true,"physicalHeadroomEvidenceValidator":true,"browserControlAdapter":true,"sidecarSessionLifecycle":true,"sidecarLeaseSeparation":true,"sidecarControlIdleLease":true,"controlPolicyContract":true,"controlProtocolManifest":true,"protocolRuntimeBinding":true,"deterministicEvidenceFixtures":true,"sharedEvidenceBookkeeping":true,"sidecarErrorResponseContract":true,"browserAssetRouteEvidence":true,"nullHeadroomProofScope":true,"browserLabCsp":true,"physicalAudio":false,"claim":"native-p0-host-validation-only"}
JSON
printf 'native-p0-validation-pass %s\n' "$OUT/P0N_NATIVE_VALIDATION_GATE.json"
