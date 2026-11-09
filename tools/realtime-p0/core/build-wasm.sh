#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/../artifacts/p0_core.wasm"
if command -v clang >/dev/null 2>&1; then
  clang --target=wasm32 -O3 -fno-builtin -nostdlib -Wl,--no-entry -Wl,--export-memory -Wl,--export-dynamic -Wl,--strip-all -Wl,-z,stack-size=65536 -Wl,--initial-memory=262144 -Wl,--max-memory=262144 -o "$OUT" "$HERE/p0_core.c"
elif [[ -n "${P0_ZIG:-}" && -x "$P0_ZIG" ]]; then
  "$P0_ZIG" build-exe "$HERE/p0_core.c" -target wasm32-freestanding -O ReleaseFast -fno-entry -rdynamic --stack 65536 --initial-memory=262144 --max-memory=262144 "-femit-bin=$OUT" -cflags -fno-builtin --
else
  echo 'Need Clang with wasm32 linker, or set P0_ZIG to an installed Zig executable.' >&2
  exit 1
fi
printf 'built %s\n' "$OUT"
sha256sum "$OUT"
