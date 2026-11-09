#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/artifacts"
mkdir -p "$OUT"
CC_BIN="${CC:-cc}"
"$CC_BIN" -O1 -g -fno-omit-frame-pointer -fno-builtin -std=c11 -Wall -Wextra -pthread -fsanitize=thread \
  "$HERE/src/p0_native_host.c" "$HERE/src/p0_native_null_driver.c" -lm -o "$OUT/p0_native_null_host_tsan"

run_tsan_portable() {
  local output="$1"; shift
  local err="${output}.stderr"
  local rc
  set +e
  TSAN_OPTIONS="halt_on_error=1" "$@" >"$output" 2>"$err"
  rc=$?
  set -e
  if [[ $rc -ne 0 ]] && grep -q 'ThreadSanitizer: unexpected memory mapping' "$err" && command -v setarch >/dev/null 2>&1; then
    set +e
    setarch "$(uname -m)" -R env TSAN_OPTIONS="halt_on_error=1" "$@" >"$output" 2>"$err"
    rc=$?
    set -e
  fi
  if [[ $rc -ne 0 ]]; then
    cat "$err" >&2
    return "$rc"
  fi
  rm -f "$err"
}

run_tsan_portable "$OUT/P0N_NULL_DRIVER_TSAN.ndjson" "$OUT/p0_native_null_host_tsan" --driver-concurrency-selftest
run_tsan_portable "$OUT/P0N_NULL_DRIVER_LIFECYCLE_TSAN.ndjson" "$OUT/p0_native_null_host_tsan" --driver-lifecycle-selftest
grep -q '"type":"driver-concurrency".*"pass":true' "$OUT/P0N_NULL_DRIVER_TSAN.ndjson"
grep -q '"type":"driver-lifecycle".*"pass":true' "$OUT/P0N_NULL_DRIVER_LIFECYCLE_TSAN.ndjson"
printf 'driver-tsan-pass %s %s\n' "$OUT/P0N_NULL_DRIVER_TSAN.ndjson" "$OUT/P0N_NULL_DRIVER_LIFECYCLE_TSAN.ndjson"
