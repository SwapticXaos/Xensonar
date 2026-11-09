#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT
node tools/audio/test-post-master-output.mjs
node tools/audio/test-post-master-transport.mjs
node tools/audio/test-post-master-worker.mjs
node tools/audio/test-post-master-tap.mjs
cc -O2 -std=c11 -Wall -Wextra -Werror tools/realtime-p0/native-p0/tests/test_post_master_pcm.c -lm -o "$OUT/pcm"
"$OUT/pcm"
cc -O2 -std=c11 -Wall -Wextra -Werror -pthread tools/realtime-p0/native-p0/tests/test_post_master_lifecycle.c -lm -o "$OUT/lifecycle"
"$OUT/lifecycle"
cc -O2 -fno-builtin -std=c11 -Wall -Wextra -Werror -pthread \
  tools/realtime-p0/native-p0/src/p0_native_host.c tools/realtime-p0/native-p0/src/p0_native_null_driver.c -lm -o "$OUT/host"
node tools/realtime-p0/native-p0/tests/test_post_master_stream.mjs "$OUT/host"
