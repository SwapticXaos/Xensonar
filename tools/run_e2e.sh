#!/bin/bash
# Browser tests. (1) tests/e2e/*.cjs against a TEST-ONLY probe build (never index.html);
# (2) green Oct-28 browser tests against dist/XenSonar_Standalone.html (= copy of index.html).
set -eu
cd "$(dirname "$0")/.."
python3 tools/build.py --probe >/dev/null
python3 tools/build.py --check >/dev/null
for t in tests/e2e/*.cjs; do echo "== $t"; node "$t" dist/XenSonar_PROBE.html; done
cp index.html dist/XenSonar_Standalone.html
for t in ui_side_arrows mix_audio_browser ui_visual_restore power_browser_smoke test_stamp_full_browser_p37; do
  echo "== tests/$t.cjs"; node "tests/$t.cjs" | tail -1
done
