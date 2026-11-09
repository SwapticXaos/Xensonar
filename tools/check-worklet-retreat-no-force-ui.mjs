import fs from 'node:fs';

const app = fs.readFileSync('src/App.tsx', 'utf8');
const main = fs.readFileSync('src/main.tsx', 'utf8');
const pkg = fs.readFileSync('package.json', 'utf8');

function fail(message) {
  console.error(`[worklet-retreat-no-force-ui] FAIL: ${message}`);
  process.exit(1);
}

for (const [label, source] of [['App.tsx', app], ['main.tsx', main]]) {
  for (const forbidden of [
    'installForceCellBodyButton',
    'forceCellIgniter',
    'KRAFTSTROM TESTEN',
    'data-xensonar-force-cell-igniter',
    'StableMusicLaneSpeakerProbeOverlay',
    'useStableMusicLaneRuntimeBoundary({',
    'buildStableMusicLaneSnapshot({',
  ]) {
    if (source.includes(forbidden)) fail(`${label} still contains ${forbidden}`);
  }
}

if (!app.includes('const readStableMusicLaneBeatWorkletOnly = useCallback(\n    () => false')) {
  fail('Legacy beat must not be suppressed by StableMusicLane worklet-only test code');
}

console.log('[worklet-retreat-no-force-ui] PASS ForceCell/StableMusicLane UI runtime is not mounted; legacy beat suppression is disabled.');
