#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];
const read = (p) => readFileSync(join(root, p), 'utf8');
const exists = (p) => existsSync(join(root, p));
const requireFile = (p) => { if (!exists(p)) failures.push(`missing ${p}`); };
const requireContains = (p, needle, note = '') => {
  if (!exists(p)) return;
  if (!read(p).includes(needle)) failures.push(`${p} missing ${needle}${note ? ` · ${note}` : ''}`);
};
const requireNotContains = (text, needle, note = '') => {
  if (text.includes(needle)) failures.push(`forbidden marker ${needle}${note ? ` · ${note}` : ''}`);
};

const appPath = 'src/App.tsx';
const graphPath = 'src/features/xensonar/audio/appMyzelDroneGraphPorts.ts';
const matrixPath = 'tools/smartMerge/879CompletionMatrix.json';
requireFile(appPath);
requireFile(graphPath);
requireFile(matrixPath);

const app = exists(appPath) ? read(appPath) : '';
const graph = exists(graphPath) ? read(graphPath) : '';
const ensureStart = app.indexOf('const ensureMyzelSynth = (ctx: AudioContext) => {');
const ensureEnd = ensureStart >= 0 ? app.indexOf('\n\n  const audioReadinessRuntimeBoundary', ensureStart) : -1;
if (ensureStart < 0 || ensureEnd < 0) failures.push('App.tsx ensureMyzelSynth block not found');
const ensureBlock = ensureStart >= 0 && ensureEnd > ensureStart ? app.slice(ensureStart, ensureEnd) : '';

for (const marker of [
  'createAppMyzelSynthGraphNodeSet',
  'configureAppMyzelSynthGraphDefaults',
  'connectAppMyzelSynthCoreRouting',
  'connectAppMyzelSynthFormantRouting',
  'connectAppMyzelSynthOvertoneRouting',
  'startAppMyzelSynthOvertoneOscillators',
  'connectAppMyzelSynthConstellationRouting',
  'startAppMyzelSynthConstellationOscillators',
  'connectAppMyzelSynthOutputRouting',
  'connectAppMyzelSynthAirRouting',
  'connectAppMyzelSynthAuxFxSends',
  'startAppMyzelSynthCoreOscillators',
  'registerAppMyzelSynthGraphNodes',
  'connectAppMyzelSynthPostFxSend',
]) {
  requireContains(graphPath, `export function ${marker}`);
  if (!ensureBlock.includes(marker)) failures.push(`ensureMyzelSynth must call ${marker}`);
}

for (const forbidden of [
  'ctx.createOscillator(',
  'ctx.createGain(',
  'ctx.createBiquadFilter(',
  'ctx.createStereoPanner(',
  'ctx.createDelay(',
  '.connect(',
  '.start()',
]) {
  requireNotContains(ensureBlock, forbidden, 'ensureMyzelSynth should delegate node creation/routing/start to graph helpers after 5.48.');
}

const orderedMarkers = [
  'const nodes = createAppMyzelSynthGraphNodeSet(ctx);',
  'configureAppMyzelSynthGraphDefaults(nodes,',
  'connectAppMyzelSynthCoreRouting(nodes);',
  'connectAppMyzelSynthFormantRouting(nodes);',
  'connectAppMyzelSynthOvertoneRouting(nodes);',
  'startAppMyzelSynthOvertoneOscillators(nodes);',
  'connectAppMyzelSynthConstellationRouting(nodes);',
  'startAppMyzelSynthConstellationOscillators(nodes);',
  'connectAppMyzelSynthOutputRouting(nodes, myzelOutputBus);',
  'ensureMyzelSynthRegisteredAudioDevices(',
  'connectAppMyzelSynthAirRouting(nodes, myzelOutputBus);',
  'connectAppMyzelSynthAuxFxSends(nodes, myzelSynthGraphPorts, ctx);',
  'startAppMyzelSynthCoreOscillators(nodes);',
  'registerAppMyzelSynthGraphNodes(refs, nodes);',
  'connectAppMyzelSynthPostFxSend(nodes, myzelSynthGraphPorts);',
];
let last = -1;
for (const marker of orderedMarkers) {
  const index = ensureBlock.indexOf(marker);
  if (index < 0) failures.push(`ensureMyzelSynth missing ordered marker: ${marker}`);
  else if (index < last) failures.push(`ensureMyzelSynth marker out of order: ${marker}`);
  last = index;
}

for (const forbidden of [
  'waveStarterLane',
  'requestWaveStarter',
  'rootFollowRuntime',
  'RootFollowRuntime',
]) {
  requireNotContains(graph, forbidden, 'Myzel graph helper must not absorb Wellenstarter or Root-Follow policy.');
}

if (exists(matrixPath)) {
  const matrix = JSON.parse(read(matrixPath));
  const slice = matrix?.slices?.find((entry) => entry.id === 'myzel_synth_and_room3');
  if (!slice) failures.push('smart-merge matrix missing myzel_synth_and_room3 slice');
  else if (!slice.sanityScripts?.includes('xensonar:check-myzel-synth-graph-factory-contract')) {
    failures.push('myzel_synth_and_room3 slice missing xensonar:check-myzel-synth-graph-factory-contract');
  }
}

if (failures.length) {
  console.error('[myzel-synth-graph-factory-contract] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('[myzel-synth-graph-factory-contract] ok');
console.log(JSON.stringify({ ensureMyzelSynthDelegated: true, helperFile: graphPath }, null, 2));
