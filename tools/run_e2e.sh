#!/bin/bash
# Browser tests in two classes (P2, 18.11.2026).
#   functional  tests/e2e/*.cjs not listed in tests/e2e/MEASURE_TESTS.txt: deterministic, run in parallel (XEN_E2E_JOBS, default 3)
#   measurement tests listed in tests/e2e/MEASURE_TESTS.txt: audio captures, levels, timing, rates; one at a time on a quiet
#               machine, one repeat when red. A repeat that passes is reported as "flaky" (counted as green, but named).
#   legacy      green Oct-28 browser tests against dist/XenSonar_Standalone.html (= copy of index.html), one at a time.
# All run against a TEST-ONLY probe build (never index.html). Every test runs even when an earlier one is red; the summary
# names each red and each flaky test; exit status is non-zero when any test is red.
#   tools/run_e2e.sh            everything (the gate before a commit; CI)
#   tools/run_e2e.sh --fast     functional + legacy only (a few minutes; for quick checks between steps)
#   tools/run_e2e.sh --measure  measurement tests only
#   XEN_E2E_ONLY=<regex>        restrict to matching test paths (any mode)
set -u
cd "$(dirname "$0")/.."
mode=${1:-all}
case "$mode" in all|--fast|--measure) ;; *) echo "usage: $0 [--fast|--measure]"; exit 2;; esac
python3 tools/build.py --probe >/dev/null || exit 1
python3 tools/build.py --check >/dev/null || exit 1
logs=dist/e2e-logs; rm -rf "$logs"; mkdir -p "$logs"
jobs=${XEN_E2E_JOBS:-3}
declare -A measure=()
while read -r n; do [[ -z "$n" || "$n" == \#* ]] && continue; measure[$n]=1; done < tests/e2e/MEASURE_TESTS.txt
want(){ [[ -z "${XEN_E2E_ONLY:-}" || "$1" =~ $XEN_E2E_ONLY ]]; }
functional=(); measured=()
for t in tests/e2e/*.cjs; do want "$t" || continue; n=$(basename "$t" .cjs)
  if [[ -n "${measure[$n]:-}" ]]; then measured+=("$t"); else functional+=("$t"); fi; done
pass=0; failed=(); flaky=(); t_all=$SECONDS
# one test, output to its log; prints "<status> <seconds> <path>"
one(){ local t=$1 log="$logs/$(basename "$1" .cjs).log" t0=$SECONDS
  if node "$t" dist/XenSonar_PROBE.html >"$log" 2>&1; then echo "ok $((SECONDS-t0)) $t"; else echo "red $((SECONDS-t0)) $t"; fi; }
export -f one; export logs
if [[ "$mode" != --measure && ${#functional[@]} -gt 0 ]]; then
  echo "== functional: ${#functional[@]} tests, $jobs in parallel"; t0=$SECONDS
  again=()
  while read -r st sec t; do
    if [[ $st == ok ]]; then pass=$((pass+1)); echo "   ok   ${sec}s $t"; else again+=("$t"); echo "   red  ${sec}s $t (repeat after the parallel phase)"; fi
  done < <(printf '%s\n' "${functional[@]}" | xargs -P "$jobs" -I{} bash -c 'one "$@"' _ {})
  # a functional test that is red under parallel load gets one quiet repeat before it counts as red
  for t in "${again[@]:-}"; do [ -n "$t" ] || continue
    if node "$t" dist/XenSonar_PROBE.html >"$logs/$(basename "$t" .cjs).repeat.log" 2>&1; then pass=$((pass+1)); flaky+=("$t (functional, red only under parallel load)"); echo "   FLAKY $t"
    else failed+=("$t"); echo "!! RED  $t"; tail -5 "$logs/$(basename "$t" .cjs).repeat.log" | sed 's/^/      /'; fi
  done
  echo "   ($((SECONDS-t0)) s)"
fi
if [[ "$mode" != --fast && ${#measured[@]} -gt 0 ]]; then
  echo "== measurement: ${#measured[@]} tests, one at a time"; t0=$SECONDS
  for t in "${measured[@]}"; do
    read -r st sec _ < <(one "$t")
    if [[ $st == ok ]]; then pass=$((pass+1)); echo "   ok   ${sec}s $t"; continue; fi
    cp "$logs/$(basename "$t" .cjs).log" "$logs/$(basename "$t" .cjs).first.log"
    read -r st2 sec2 _ < <(one "$t")
    if [[ $st2 == ok ]]; then pass=$((pass+1)); flaky+=("$t (measurement, green on repeat)"); echo "   FLAKY ${sec}s+${sec2}s $t"
    else failed+=("$t"); echo "!! RED  ${sec}s+${sec2}s $t"; tail -5 "$logs/$(basename "$t" .cjs).log" | sed 's/^/      /'; fi
  done
  echo "   ($((SECONDS-t0)) s)"
fi
if [[ "$mode" != --measure ]]; then
  cp index.html dist/XenSonar_Standalone.html
  echo "== legacy (Oct-28 browser tests)"
  for t in ui_side_arrows mix_audio_browser ui_visual_restore power_browser_smoke test_stamp_full_browser_p37; do
    want "tests/$t.cjs" || continue
    if bash -c "set -o pipefail; node tests/$t.cjs >'$logs/$t.log' 2>&1 && tail -1 '$logs/$t.log'" >/dev/null; then pass=$((pass+1)); echo "   ok   tests/$t.cjs"
    else failed+=("tests/$t.cjs"); echo "!! RED  tests/$t.cjs"; tail -5 "$logs/$t.log" | sed 's/^/      /'; fi
  done
  git checkout -- docs/UI_VISUAL_RESTORE.json 2>/dev/null || true # ui_visual_restore rewrites its report on every run
fi
echo "E2E PASS $pass  RED ${#failed[@]}  FLAKY ${#flaky[@]}  ($((SECONDS-t_all)) s, logs in $logs)"
for t in "${failed[@]:-}"; do [ -n "$t" ] && echo "  red: $t"; done
for t in "${flaky[@]:-}"; do [ -n "$t" ] && echo "  flaky: $t"; done
[ "${#failed[@]}" -eq 0 ]
