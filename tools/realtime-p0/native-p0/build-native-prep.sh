#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/artifacts"
mkdir -p "$OUT"
python3 "$HERE/generate-browser-assets.py" >/dev/null
cc -O3 -fno-builtin -std=c11 -Wall -Wextra -pthread \
  "$HERE/src/p0_native_host.c" "$HERE/src/p0_native_null_driver.c" -lm \
  -o "$OUT/p0_native_null_host"
cc -O3 -fno-builtin -std=c11 -Wall -Wextra \
  "$HERE/src/p0_native_headroom.c" -lm \
  -o "$OUT/p0_native_headroom"
cc -O3 -fno-builtin -std=c11 -Wall -Wextra \
  "$HERE/src/p0_native_synthetic_headroom.c" -lm \
  -o "$OUT/p0_native_synthetic_headroom"
cc -O3 -fno-builtin -std=c11 -Wall -Wextra -Werror -pthread \
  "$HERE/src/p0_native_physical_headroom.c" "$HERE/src/p0_native_null_driver.c" -lm \
  -o "$OUT/p0_native_physical_headroom_null"
"$OUT/p0_native_null_host" --selftest > "$OUT/P0N_NULL_HOST_SELFTEST.ndjson"
"$OUT/p0_native_null_host" --driver-lifecycle-selftest > "$OUT/P0N_NULL_DRIVER_LIFECYCLE.ndjson"
"$OUT/p0_native_null_host" --adversarial-selftest > "$OUT/P0N_ADVERSARIAL_TRANSPORT_TEST.ndjson"
"$OUT/p0_native_null_host" --signal-truth-selftest > "$OUT/P0N_SIGNAL_TRUTH.ndjson"
"$OUT/p0_native_headroom" > "$OUT/P0N_NATIVE_HEADROOM.json"
"$OUT/p0_native_synthetic_headroom" > "$OUT/P0N_SYNTHETIC_HEADROOM.json"
"$OUT/p0_native_physical_headroom_null" --null-selftest > "$OUT/P0N_PHYSICAL_HEADROOM_NULL_SELFTEST.ndjson"
cc -O3 -fno-builtin -std=c11 -Wall -Wextra -pthread "$HERE/tests/test_native_transport.c" -o "$OUT/test_native_transport"
"$OUT/test_native_transport" > "$OUT/P0N_NATIVE_TRANSPORT_TEST.json"
printf 'built %s\n' "$OUT"
