#!/usr/bin/env bash
# Runs every executable test and prints a machine-readable summary.
# Whatever this script prints is the only evidence claimed anywhere.
set -u
cd "$(dirname "$0")/.."
BIN=build
TESTS="test_determinism test_partition test_epoch test_lifecycle test_assets test_overload test_recording test_planning test_hardening test_concurrency test_toneplan test_entrophon test_rt_alloc"

pass=0; fail=0; missing=0
echo "=============================================================="
echo " xen-audio acceptance run   $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo " $(cc --version | head -1)"
echo "=============================================================="
for t in $TESTS; do
  if [ ! -x "$BIN/$t" ]; then
    echo "MISSING  $t"; missing=$((missing+1)); continue
  fi
  out=$("$BIN/$t" 2>&1); rc=$?
  echo "$out"
  if [ $rc -eq 0 ]; then echo "  => PASS"; pass=$((pass+1));
  else echo "  => FAIL (rc=$rc)"; fail=$((fail+1)); fi
  echo "--------------------------------------------------------------"
done
# End-to-end cross-check through the shipped offline tool, not just the unit
# tests: identical episode, three different device quantum patterns.
if [ -x "$BIN/xen-render" ]; then
  echo "[ tool-level partition cross-check (xen-render, 8 s episode) ]"
  hu=$("$BIN/xen-render" --seconds 8 --partition uniform --out $BIN/ep_u.wav | grep '"hash"' | tr -d ' ,"')
  hr=$("$BIN/xen-render" --seconds 8 --partition ragged  --out $BIN/ep_r.wav | grep '"hash"' | tr -d ' ,"')
  ht=$("$BIN/xen-render" --seconds 8 --partition tiny    --out $BIN/ep_t.wav | grep '"hash"' | tr -d ' ,"')
  echo "       uniform $hu | ragged $hr | tiny $ht"
  if [ "$hu" = "$hr" ] && [ "$hu" = "$ht" ]; then
    echo "  => PASS"; pass=$((pass+1))
  else
    echo "  => FAIL (hashes differ)"; fail=$((fail+1))
  fi
  echo "--------------------------------------------------------------"
fi
echo "SUMMARY: $pass passed, $fail failed, $missing missing"
if [ -x "$BIN/xen-host" ]; then
  echo "pipewire backend: COMPILED (device validation still requires a machine with a running PipeWire graph)"
else
  echo "pipewire backend: NOT COMPILED in this environment (no libpipewire-0.3-dev) - see KNOWN_LIMITATIONS.md"
fi
[ $fail -eq 0 ] && [ $missing -eq 0 ]
