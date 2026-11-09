#!/bin/bash
# Browser end-to-end tests against a TEST-ONLY probe build (never index.html). Needs Playwright + Chromium.
set -eu
cd "$(dirname "$0")/.."
python3 tools/build.py --probe >/dev/null
python3 tools/build.py --check >/dev/null
for t in tests/e2e/*.cjs; do echo "== $t"; node "$t" dist/XenSonar_PROBE.html; done
