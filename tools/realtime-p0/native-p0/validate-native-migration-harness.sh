#!/usr/bin/env bash
set -euo pipefail
export LC_ALL=C
HERE="$(cd "$(dirname "$0")" && pwd)"
python3 "$HERE/migration/run_native_migration_harness.py" "$@"
