#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/artifacts"
mkdir -p "$OUT"
CC_BIN="${CC:-cc}"
"$CC_BIN" -O1 -g -fno-omit-frame-pointer -fno-builtin -std=c11 -Wall -Wextra -pthread -fsanitize=thread \
  "$HERE/tests/test_native_transport.c" -o "$OUT/test_native_transport_tsan"

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

run_tsan_portable "$OUT/P0N_NATIVE_TRANSPORT_TSAN.json" "$OUT/test_native_transport_tsan"
printf 'tsan-pass %s\n' "$OUT/P0N_NATIVE_TRANSPORT_TSAN.json"
