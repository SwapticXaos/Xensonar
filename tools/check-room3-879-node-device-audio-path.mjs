#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const appPath = path.join(root, 'src', 'App.tsx');
const modulePath = path.join(root, 'src', 'features', 'xensonar', 'room3', 'room3NodeDeviceAudioPath.ts');
const registryPath = path.join(root, 'src', 'features', 'xensonar', 'myzelSynth', 'myzelSynthRegistry.ts');
const room3UiStatePath = path.join(root, 'src', 'features', 'xensonar', 'room3', 'useRoom3TopologyUiState.ts');
const nexusRuntimeRefsPath = path.join(root, 'src', 'features', 'xensonar', 'rooms', 'resonanceNexusRuntimeRefs.ts');

const app = fs.readFileSync(appPath, 'utf8');
const mod = fs.readFileSync(modulePath, 'utf8');
const registry = fs.readFileSync(registryPath, 'utf8');
const room3UiState = fs.existsSync(room3UiStatePath) ? fs.readFileSync(room3UiStatePath, 'utf8') : '';
const nexusRuntimeRefs = fs.existsSync(nexusRuntimeRefsPath) ? fs.readFileSync(nexusRuntimeRefsPath, 'utf8') : '';
const room3RuntimeBoundaryPath = path.join(root, 'src', 'features', 'xensonar', 'room3', 'useRoom3NodeDeviceAndLegacyAudioRuntimeBoundary.ts');
const room3NodeDeviceRuntimePath = path.join(root, 'src', 'features', 'xensonar', 'room3', 'useRoom3NodeDeviceAudioFrameRuntime.ts');
const myzelDroneGraphPortsPath = path.join(root, 'src', 'features', 'xensonar', 'audio', 'appMyzelDroneGraphPorts.ts');
const room3RuntimeBoundary = fs.existsSync(room3RuntimeBoundaryPath) ? fs.readFileSync(room3RuntimeBoundaryPath, 'utf8') : '';
const room3NodeDeviceRuntime = fs.existsSync(room3NodeDeviceRuntimePath) ? fs.readFileSync(room3NodeDeviceRuntimePath, 'utf8') : '';
const myzelDroneGraphPorts = fs.existsSync(myzelDroneGraphPortsPath) ? fs.readFileSync(myzelDroneGraphPortsPath, 'utf8') : '';

const appChecks = [
  ['keeps Room III runtime boundary mounted from App', 'useRoom3NodeDeviceAndLegacyAudioRuntimeBoundary'],
  ['keeps node-device envelope ref wired in App contract', 'myzelAudioFieldEnvelopeRef'],
  ['connects drive shaper through color post gain', 'driveShaper.connect(colorPostGain)'],
  ['connects color post gain to master', 'colorPostGain.connect(master)'],
  ['connects air delay wet path to output bus', 'airWetGain.connect(myzelOutputBus)'],
  ['ensures registered myzel synth audio devices on myzel output bus', 'ensureMyzelSynthRegisteredAudioDevices(ctx, refs, myzelOutputBus, refs.noiseBuffer)'],
];

const nexusRuntimeRefChecks = [
  ['has 8.79 color post gain node ref', 'myzelColorPostGain'],
  ['has 8.79 air send node ref', 'myzelAirSend'],
  ['has 8.79 air delay node ref', 'myzelAirDelay'],
  ['has semantic device live ref', '_semanticDevice'],
  ['has topological resonator live ref', '_topologicalResonator'],
];

const registryChecks = [
  ['exports registered audio-device ensure boundary', 'export function ensureMyzelSynthRegisteredAudioDevices'],
  ['registry owns semantic device construction', 'ensureSemanticInteractionDevice(ctx, refs, targetBus, noiseBuffer)'],
  ['registry owns topological device construction', 'ensureTopologicalResonator(ctx, refs, targetBus)'],
];

const moduleChecks = [
  ['exports extracted frame updater', 'export function updateRoom3NodeDeviceAudioFrame'],
  ['reads nodal constellation fingerprint', 'deriveNodalConstellationFingerprint(snapshot, nodalMatrix)'],
  ['reads nodal target aggregate', "getNodalTargetAggregate(nodalMatrix, 'myzelColorVoice')"],
  ['updates semantic interaction device from snapshot', 'updateSemanticInteractionDevice(audioCtx, refs, snapshot'],
  ['updates topological resonator from snapshot', 'updateTopologicalResonator(audioCtx, refs, snapshot'],
  ['evaluates nodal modulation matrix', 'evaluateNodalModulationMatrix(nodalModSources, DEFAULT_NODAL_MOD_ROUTES)'],
  ['uses snapshot spatial sub as audible sub path', 'snapshot.myzelSpatialSub'],
  ['uses snapshot bitcrusher/wavefolder as drive path', 'snapshot.myzelSpatialBitcrusher'],
  ['uses snapshot resonator as Q/path', 'snapshot.myzelSpatialResonator'],
  ['uses snapshot shimmer/chorus as air path', 'snapshot.myzelSpatialShimmer'],
  ['returns sub telemetry', 'subDevice: fieldVoidSub'],
  ['returns crush telemetry', 'crushDevice: spatialDistortion'],
  ['returns resonator telemetry', 'resonatorDevice: Math.max(fieldFormant, topologicalRelationEnergy)'],
  ['returns vibe telemetry', 'vibeDevice: fieldAirPressure'],
];

const failures = [];
for (const [label, needle] of appChecks) {
  const graphNeedle = needle === 'driveShaper.connect(colorPostGain)' || needle === 'colorPostGain.connect(master)' || needle === 'airWetGain.connect(myzelOutputBus)';
  const updateNeedle = needle === 'updateRoom3NodeDeviceAudioFrame';
  const content = graphNeedle ? myzelDroneGraphPorts : updateNeedle ? room3NodeDeviceRuntime : app;
  const fileLabel = graphNeedle ? 'appMyzelDroneGraphPorts.ts' : updateNeedle ? 'useRoom3NodeDeviceAudioFrameRuntime.ts' : 'App.tsx';
  const effectiveNeedles = graphNeedle
    ? needle === 'driveShaper.connect(colorPostGain)'
      ? ['driveShaper.connect(colorPostGain)', 'nodes.driveShaper.connect(nodes.colorPostGain)']
      : needle === 'colorPostGain.connect(master)'
        ? ['colorPostGain.connect(master)', 'nodes.colorPostGain.connect(nodes.master)']
        : ['airWetGain.connect(myzelOutputBus)', 'nodes.airWetGain.connect(outputBus)']
    : [needle];
  if (!effectiveNeedles.some((candidate) => content.includes(candidate))) failures.push([fileLabel, label, needle]);
}
if (!room3NodeDeviceRuntime.includes('updateRoom3NodeDeviceAudioFrame({')) failures.push(['useRoom3NodeDeviceAudioFrameRuntime.ts', 'owns node-device frame update', 'updateRoom3NodeDeviceAudioFrame({']);
if (!room3RuntimeBoundary.includes('useRoom3NodeDeviceAudioFrameRuntime(args)')) failures.push(['useRoom3NodeDeviceAndLegacyAudioRuntimeBoundary.ts', 'delegates node-device frame owner', 'useRoom3NodeDeviceAudioFrameRuntime(args)']);
for (const [label, needle] of nexusRuntimeRefChecks) if (!nexusRuntimeRefs.includes(needle)) failures.push(['resonanceNexusRuntimeRefs.ts', label, needle]);
if (!room3UiState.includes('createRoom3NodeDeviceAudioEnvelope()')) {
  failures.push(['useRoom3TopologyUiState.ts', 'creates node-device envelope through extracted state seam', 'createRoom3NodeDeviceAudioEnvelope()']);
}
for (const [label, needle] of registryChecks) if (!registry.includes(needle)) failures.push(['myzelSynthRegistry.ts', label, needle]);
for (const [label, needle] of moduleChecks) if (!mod.includes(needle)) failures.push(['room3NodeDeviceAudioPath.ts', label, needle]);

if (failures.length) {
  console.error('[room3-879-node-device-audio-path] FAIL');
  for (const [file, label, needle] of failures) console.error(`- ${file}: ${label}: missing ${needle}`);
  process.exit(1);
}

const appTsxLines = app.split(/\r?\n/).length;
const moduleLines = mod.split(/\r?\n/).length;
console.log(JSON.stringify({
  ok: true,
  check: 'room3-879-node-device-audio-path',
  checked: appChecks.length + nexusRuntimeRefChecks.length + registryChecks.length + moduleChecks.length + 1,
  appTsxLines,
  nexusRuntimeRefsLines: nexusRuntimeRefs.split(/\r?\n/).length,
  moduleLines,
  note: 'Verifies that the 8.79 Room-III node-device path reaches concrete AudioGraph nodes through the extracted module, not only labels/aura fields.'
}, null, 2));
