#!/usr/bin/env node
import { createCheck } from './lib/check-kit.mjs';

const check = createCheck('check-app-resonance-nexus-main-loop-boundary');
const { read, exists, requireText, forbidText, failures } = check;

const paths = {
  app: 'src/App.tsx',
  boundary: 'src/features/xensonar/rooms/useAppResonanceNexusMainLoopBoundary.ts',
  coreAudio: 'src/features/xensonar/audio/resonanceNexusCoreAudioSession.ts',
  jiLayer: 'src/features/xensonar/audio/resonanceJiFilterLayer.ts',
  frameRuntime: 'src/features/xensonar/rooms/resonanceNexusFrameRuntime.ts',
  boundaryTypes: 'src/features/xensonar/rooms/resonanceNexusRuntimeBoundaryTypes.ts',
  fieldTraffic: 'src/features/xensonar/rooms/resonanceNexusFieldTrafficFrame.ts',
  fieldKernel: 'src/features/xensonar/rooms/resonanceNexusFieldFrame.ts',
  overlay: 'src/features/xensonar/rooms/resonanceNexusOverlayFrame.ts',
  map: 'src/features/xensonar/layout/appMonolithPartitionMap.ts',
  pkg: 'package.json',
};
for (const rel of Object.values(paths)) if (!exists(rel)) failures.push(`missing ${rel}`);
const src = Object.fromEntries(Object.entries(paths).map(([key, rel]) => [key, exists(rel) ? read(rel) : '']));
const pkg = src.pkg ? JSON.parse(src.pkg) : { scripts: {} };

for (const marker of [
  'coreAudioSessionSeparatedFromFrameRuntime: true',
  'singleReactLifecyclePreserved: true',
  'jiOscillatorOwnershipCanonicalFilterLayer: true',
  'createResonanceNexusCoreAudioSession({',
  'coreAudio.ensureJiLayer();',
  'startResonanceNexusFrameRuntime({',
  'frameRuntime.stop();',
  'coreAudio.dispose();',
  '}, [room, nexusActive, audioCtx]);',
]) requireText('Nexus lifecycle composition', src.boundary, marker);

const stopIndex = src.boundary.indexOf('frameRuntime.stop();');
const disposeIndex = src.boundary.indexOf('coreAudio.dispose();');
if (!(stopIndex >= 0 && disposeIndex > stopIndex)) failures.push('frame runtime must stop before core audio disposal');

for (const marker of [
  'ownsPrimaryOscillatorLifecycle: true',
  'ownsEchoDelayLifecycle: true',
  'ownsCanonicalJiFilterLayerLifecycle: true',
  'const osc = ctx.createOscillator();',
  'const filter = ctx.createBiquadFilter();',
  'const gain = ctx.createGain();',
  'const delayNode = ctx.createDelay(3.0);',
  'ensureJiLayer: () => ensureResonanceJiFilterLayer(ctx, filter, nexusRefs)',
  'disposeResonanceJiFilterLayer(nexusRefs);',
]) requireText('Core audio session ownership', src.coreAudio, marker);
for (const forbidden of ['requestAnimationFrame(', 'cancelAnimationFrame(']) forbidText('Core audio session owns no RAF', src.coreAudio, forbidden);

for (const marker of [
  'canonicalJiOscillatorOwner: true',
  'preservesLiveGreen260FilterRoute: true',
  'gain.connect(filter);',
  'nexusRefs.current.jiOscs[node.label] = osc;',
  'nexusRefs.current.jiOscs = {};',
]) requireText('Canonical JI filter layer', src.jiLayer, marker);
for (const forbidden of ['overtoneMaster.connect', 'gain.connect(refs.overtoneMaster)']) forbidText('Canonical JI layer must not route through overtoneMaster', src.jiLayer, forbidden);

requireText('Neutral Nexus runtime port type owner', src.boundaryTypes, 'export type AppResonanceNexusMainLoopBoundaryArgs = {');
forbidText('Frame runtime must not type-import composition boundary', src.frameRuntime, 'from "./useAppResonanceNexusMainLoopBoundary"');

for (const marker of [
  'ownsRafLifecycle: true',
  'ownsNoAudioNodeCreation: true',
  'startsLoopSynchronously: true',
  'runResonanceNexusDroneAudioFrame({',
  'renderResonanceNexusBackgroundFrame(c, state, t);',
  'runResonanceNexusFieldTrafficFrame({',
  'runResonanceNexusOverlayFrame({',
  'rafId = requestAnimationFrame(loop);',
  'loop();',
  'stop: () => cancelAnimationFrame(rafId)',
]) requireText('RAF frame runtime', src.frameRuntime, marker);
for (const forbidden of ['createOscillator()', 'createGain()', 'createBiquadFilter()', 'createDelay(']) forbidText('Frame runtime owns no AudioNode creation', src.frameRuntime, forbidden);
const frameOrder = [
  'runResonanceNexusDroneAudioFrame({',
  'renderResonanceNexusBackgroundFrame(c, state, t);',
  'runResonanceNexusFieldTrafficFrame({',
  'runResonanceNexusOverlayFrame({',
  'rafId = requestAnimationFrame(loop);',
];
let last = -1;
for (const marker of frameOrder) {
  const index = src.frameRuntime.indexOf(marker);
  if (index < 0 || index <= last) failures.push(`frame order changed around ${marker}`);
  last = index;
}

const trafficOrder = ['advanceFieldWaveStep(fieldStep.motionScale);', 'advanceAppParticleSimulationFrameBoundary({', 'renderFieldWaves();', 'renderAppParticleSimulationFrameBoundary({', 'runAppResidentTrafficBridgeFrameBoundary({'];
last = -1;
for (const marker of trafficOrder) {
  const index = src.fieldTraffic.indexOf(marker);
  if (index < 0 || index <= last) failures.push(`field/traffic order changed around ${marker}`);
  last = index;
}
requireText('Overlay owns grid state mutation', src.overlay, 'ownsGridLineRuntimeMutation: true');
requireText('Field kernel preserves caller interleave', src.fieldKernel, 'preservesWaveParticleInterleaveAtCaller: true');

for (const marker of [
  'useAppSecondaryDroneOscillatorLifecycleBoundary({',
  'useAppResonanceNexusMainLoopBoundary({',
  'resonanceFieldStepClockRef,',
  'quantizeAnchorRef,',
  'waveCollisionQueueRef,',
]) requireText('App boundary callsite', src.app, marker);
for (const forbidden of [
  'useAppJiOvertoneMasterLifecycleBoundary({',
  'const fieldStepFrame = resolveResonanceFieldStepFrame(',
  'runAppResidentTrafficBridgeFrameBoundary({',
]) forbidText('App no longer owns retired Nexus/JI bodies', src.app, forbidden);
const secondaryOscIndex = src.app.indexOf('useAppSecondaryDroneOscillatorLifecycleBoundary({');
const boundaryCallIndex = src.app.indexOf('useAppResonanceNexusMainLoopBoundary({');
const droneFrameSyncIndex = src.app.indexOf('useAppDroneFrameMixSyncBoundary({');
if (!(secondaryOscIndex >= 0 && boundaryCallIndex > secondaryOscIndex && droneFrameSyncIndex > boundaryCallIndex)) failures.push('Hook order changed: secondary osc/LFO -> Nexus boundary -> Drone frame mix sync');

for (const marker of [
  "status: 'resonance-nexus-runtime-sessions-separated'",
  "splitTarget: 'resonance-nexus-core-audio-session-plus-frame-runtime'",
  "firstSafeMove: 'resonance-nexus-runtime-sessions-separated'",
]) requireText('Monolith partition map Patch 265 status', src.map, marker);

const appLines = src.app.split(/\r?\n/).length;
const boundaryLines = src.boundary.split(/\r?\n/).length;
if (appLines > 2325) failures.push(`App.tsx should remain <=2325 lines, got ${appLines}`);
if (boundaryLines > 180) failures.push(`Nexus composition boundary should remain <=180 lines, got ${boundaryLines}`);
const scriptName = 'xensonar:check-app-resonance-nexus-main-loop-boundary';
if (pkg.scripts?.[scriptName] !== 'node tools/check-app-resonance-nexus-main-loop-boundary.mjs') failures.push(`package script missing ${scriptName}`);

check.finish({
  ok: failures.length === 0,
  appLines,
  boundaryLines,
  architecture: 'core-audio-session + synchronous-frame-runtime under one React lifecycle',
  canonicalJiRoute: 'filter-routed live-green-260 path',
  failures,
});
