#!/usr/bin/env bash
set -euo pipefail

SLUG="${1:-patch}"
HTML_BUDGET="${HTML_BUDGET:-3800000}"
ARTIFACT_DIR="${XENSONAR_ARTIFACT_DIR:-/mnt/data}"
BUILD_SCRIPT="${XENSONAR_BUILD_SCRIPT:-build:core-singlefile}"
BUILD_TIMEOUT_MS="${XENSONAR_BUILD_TIMEOUT_MS:-1800000}"

npm run patch:setup:auto

node tools/run-command-with-heartbeat.mjs \
  --label "vite-${BUILD_SCRIPT}" \
  --timeout-ms "${BUILD_TIMEOUT_MS}" \
  -- \
  npm run "${BUILD_SCRIPT}"

npm run inspect:html -- dist/index.html
npm run assert:html-budget -- dist/index.html "${HTML_BUDGET}"

if [[ ! -d "${ARTIFACT_DIR}" ]]; then
  ARTIFACT_DIR="dist-artifacts"
  mkdir -p "${ARTIFACT_DIR}"
fi

VERSION="$(node -p "require('./package.json').version || 'dev'")"
SAFE_SLUG="$(printf '%s' "${SLUG}" | tr -cs 'A-Za-z0-9._-' '_' | sed 's/^_\|_$//g')"
OUT_HTML="${ARTIFACT_DIR}/Xensonar_${VERSION}_${SAFE_SLUG}.html"
cp dist/index.html "${OUT_HTML}"

echo "[xensonar-patch-html] HTML bereit: ${OUT_HTML}"
