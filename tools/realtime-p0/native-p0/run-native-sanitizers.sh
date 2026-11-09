#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/artifacts"
mkdir -p "$OUT"
CC_BIN="${CC:-cc}"
"$CC_BIN" -O1 -g -fno-omit-frame-pointer -fno-builtin -std=c11 -Wall -Wextra -pthread \
  -fsanitize=address,undefined \
  "$HERE/src/p0_native_host.c" "$HERE/src/p0_native_null_driver.c" -lm \
  -o "$OUT/p0_native_null_host_asan"
ASAN_OPTIONS="detect_leaks=1:halt_on_error=1" UBSAN_OPTIONS="halt_on_error=1" \
  "$OUT/p0_native_null_host_asan" --adversarial-selftest > "$OUT/P0N_ADVERSARIAL_ASAN.ndjson"
grep -q '"type":"adversarial-end","pass":true' "$OUT/P0N_ADVERSARIAL_ASAN.ndjson"
printf 'asan-ubsan-pass %s\n' "$OUT/P0N_ADVERSARIAL_ASAN.ndjson"
