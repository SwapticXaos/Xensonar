#!/bin/bash
# Browser tests. (1) tests/e2e/*.cjs against a TEST-ONLY probe build (never index.html);
# (2) green Oct-28 browser tests against dist/XenSonar_Standalone.html (= copy of index.html).
# Every test runs even when an earlier one is red (one timing outlier must not hide the rest); the summary names
# each red test, and the script still exits non-zero when any test is red. XEN_E2E_ONLY=<regex> runs a subset.
set -u
cd "$(dirname "$0")/.."
python3 tools/build.py --probe >/dev/null || exit 1
python3 tools/build.py --check >/dev/null || exit 1
pass=0; failed=()
run(){ local name=$1; shift; echo "== $name"; local t0=$SECONDS
  if "$@"; then pass=$((pass+1)); else failed+=("$name"); echo "!! RED: $name"; fi
  echo "   ($((SECONDS-t0)) s)"; }
for t in tests/e2e/*.cjs; do
  [[ -n "${XEN_E2E_ONLY:-}" && ! "$t" =~ $XEN_E2E_ONLY ]] && continue
  run "$t" node "$t" dist/XenSonar_PROBE.html
done
cp index.html dist/XenSonar_Standalone.html
for t in ui_side_arrows mix_audio_browser ui_visual_restore power_browser_smoke test_stamp_full_browser_p37; do
  [[ -n "${XEN_E2E_ONLY:-}" && ! "tests/$t.cjs" =~ $XEN_E2E_ONLY ]] && continue
  run "tests/$t.cjs" bash -c "set -o pipefail; node tests/$t.cjs | tail -1"
done
echo "E2E PASS $pass  RED ${#failed[@]}"
for t in "${failed[@]:-}"; do [ -n "$t" ] && echo "  red: $t"; done
[ "${#failed[@]}" -eq 0 ]
