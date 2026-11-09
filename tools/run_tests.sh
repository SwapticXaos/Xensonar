#!/bin/bash
# Runs the regression tests that are known green (tests/GREEN_NODE_TESTS.txt) against the current tree.
# Tests come from the Oct-28 source tree; some read dist/XenSonar_Standalone.html, which is a copy of index.html.
set -u
cd "$(dirname "$0")/.."
mkdir -p dist && cp index.html dist/XenSonar_Standalone.html
pass=0; fail=0; failed=()
while read -r t; do
  [ -z "$t" ] && continue
  if [[ "$t" == *.test.cjs ]]; then cmd=(node --test "tests/$t"); else cmd=(node "tests/$t"); fi
  if timeout 180 "${cmd[@]}" >/tmp/xen_test_out.txt 2>&1 </dev/null; then pass=$((pass+1)); else fail=$((fail+1)); failed+=("$t"); tail -5 /tmp/xen_test_out.txt; fi
done < tests/GREEN_NODE_TESTS.txt
echo "PASS $pass  FAIL $fail"
for t in "${failed[@]:-}"; do [ -n "$t" ] && echo "  failed: $t"; done
[ "$fail" -eq 0 ]
