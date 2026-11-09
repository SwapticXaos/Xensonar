import fs from 'node:fs';

const dirtyPath = 'src/features/xensonar/rootFollow/rootFollowDirtyMaschine.ts';
const rendererPath = 'src/features/xensonar/rootFollow/rootFollowMaterialRenderer.ts';
const runtimePath = 'src/features/xensonar/rootFollow/rootFollowRuntimeBoundary.ts';

function fail(message) {
  console.error(`[root-follow-dirty-walze-contract] FAIL ${message}`);
  process.exit(1);
}

const dirty = fs.readFileSync(dirtyPath, 'utf8');
const renderer = fs.readFileSync(rendererPath, 'utf8');
const runtime = fs.readFileSync(runtimePath, 'utf8');

for (const forbidden of ['react', 'AudioWorklet', 'audioWorklet', 'waveStarter', 'StableMusicLane', 'stableMusicLane']) {
  if (dirty.includes(forbidden)) fail(`${dirtyPath} must not import/use ${forbidden}`);
}

for (const required of [
  'DIRTY_ROOT_FOLLOW_CRAZY_FLUTTER_LABEL = "Crazy Flutter"',
  'class DirtyRootFollowWalze',
  'createBufferSource()',
  'createGain()',
  'createStereoPanner()',
  'createOscillator()',
  'createDynamicsCompressor()',
  'setTargetAtTime',
  'getElasticDestination',
  'setElasticGain',
  'drosselnWalzeBedOnly',
  'new Map<AudioContext, DirtyRootFollowWalze>()',
  'getDirtyRootFollowWalze',
  'disposeAllDirtyRootFollowWalzen',
]) {
  if (!dirty.includes(required)) fail(`${dirtyPath} missing ${required}`);
}

for (const required of [
  'getDirtyRootFollowWalze',
  'dirtyDrosselDefaultEnabled = true',
  'legacyBaseDestination',
  'dirtyDrossel.drosselnWalzeBedOnly()',
  'dirtyDrossel.setElasticGain',
  'dirtyDrossel.getElasticDestination()',
  'const legacyDestination = dirtyDrossel',
  'scheduleMaterialElasticSlice({',
  'destination: legacyDestination',
]) {
  if (!renderer.includes(required)) fail(`${rendererPath} missing ${required}`);
}

for (const forbidden of [
  'default-rfl-dirty-walze-bounded-elastic-jaw-bypasses-material-slice-storm',
  'dirtyGranularTuning',
  'walze.feuern({',
  'reason: "default-rfl-dirty-walze',
]) {
  if (renderer.includes(forbidden)) fail(`${rendererPath} must not keep Crazy Flutter as default (${forbidden})`);
}

const drosselIdx = renderer.indexOf('dirtyDrosselDefaultEnabled = true');
const destIdx = renderer.indexOf('const legacyDestination = dirtyDrossel');
const sliceIdx = renderer.indexOf('scheduleMaterialElasticSlice({', destIdx);
if (!(drosselIdx >= 0 && destIdx > drosselIdx && sliceIdx > destIdx)) {
  fail('dirty drossel must wrap the original legacy destination before the original elastic slice scheduler runs');
}

if (!runtime.includes('disposeAllDirtyRootFollowWalzen()')) {
  fail(`${runtimePath} must dispose dirty walzen during root-follow stop cleanup`);
}

console.log('[root-follow-dirty-walze-contract] PASS');
