import fs from 'node:fs';

const required = [
  ['src/external/microto/integrations/xensonar/mprgBridgeAdapter.ts', [
    'surveyMicrotoAsMprgAdapterSurface',
    'adaptMprgBridgePayloadToMicrotoMelodicLoopSeed',
    'Microto already carries',
    'audio-truth-claim-ignored-by-xensonar-seed-adapter',
    "'motion'",
    "'jump'",
    "'checkpoint'",
    "'phase_gate'",
  ]],
  ['src/external/microto/integrations/xensonar/types.ts', [
    'MicrotoMprgBridgeMetadata',
    'mprgBridge?: MicrotoMprgBridgeMetadata',
    'truthBoundary',
  ]],
  ['src/features/l3lab/canonicalForge/microtoMelodicLoopHandoff.ts', [
    'queueMprgBridgePayloadAsMicrotoMelodicLoopSeed',
    'adaptMprgBridgePayloadToMicrotoMelodicLoopSeed',
    'truthBoundary: { ...seed.mprgBridge.truthBoundary }',
  ]],
];

let ok = true;
for (const [file, needles] of required) {
  const text = fs.readFileSync(file, 'utf8');
  for (const needle of needles) {
    if (!text.includes(needle)) {
      console.error(`[mprg-microto-bridge-adapter] missing ${needle} in ${file}`);
      ok = false;
    }
  }
}
if (!ok) process.exit(1);
console.log('[mprg-microto-bridge-adapter] OK: Microto seed adapter + mPRG whole-head overlay contracts present.');
