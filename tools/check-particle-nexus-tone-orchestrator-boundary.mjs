#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const app = read('src/App.tsx');
const boundaryPath = 'src/features/xensonar/audio/particleNexusToneOrchestrator.ts';
const boundary = fs.existsSync(path.join(root, boundaryPath)) ? read(boundaryPath) : '';

const failures = [];
const mustContain = [
  [boundary, 'export function runParticleNexusToneOrchestrator', 'particle nexus tone orchestrator export missing'],
  [boundary, 'export interface ParticleNexusToneRuntime', 'orchestrator runtime contract missing'],
  [boundary, 'export interface ParticleNexusToneRequest', 'orchestrator request contract missing'],
  [boundary, 'export interface ParticleNexusFxRuntime', 'FX runtime contract missing'],
  [boundary, 'export interface ParticleNexusAuxTargetsRuntime', 'aux target runtime contract missing'],
  [boundary, 'resolveParticleAdmissionRequest({', 'orchestrator must own particle admission delegation'],
  [boundary, 'resolveParticleTonePlanningRequest({', 'orchestrator must own tone-planning delegation'],
  [boundary, 'ensureParticleFxRoutes({', 'orchestrator must own particle FX route ensure delegation'],
  [boundary, 'buildParticleAuxTargets({', 'orchestrator must own particle aux target assembly delegation'],
  [boundary, 'assembleParticleRuntimePlaybackRequest({', 'orchestrator must own runtime request assembly delegation'],
  [boundary, 'buildParticlePlaybackDispatchRuntime({', 'orchestrator must own playback callback runtime build'],
  [boundary, 'dispatchParticlePlayback(playbackRuntime, particleRuntimeRequest.dispatchRequest)', 'orchestrator must dispatch assembled playback request'],
  [boundary, 'particleGradientX', 'orchestrator must preserve X gradient contract'],
  [boundary, 'particleGradientY', 'orchestrator must preserve Y gradient contract'],
  [boundary, 'particleSampleProfileMode', 'orchestrator must preserve sample profile mode forwarding'],
  [app, 'runParticleNexusToneOrchestrator({', 'App.tsx must delegate particle nexus tone orchestration'],
  [app, 'guardState: refucktorAudioGuardRef.current', 'App.tsx must pass Refucktor guard state to orchestrator'],
  [app, 'recordAudioPressureCount', 'App.tsx must pass audio-pressure counter to orchestrator'],
  [app, 'particlePreset: nexusParamsRef.current.particlePreset', 'App.tsx must pass particle preset to orchestrator'],
  [app, 'particleGradientX: nexusParamsRef.current.particleGradientX', 'App.tsx must pass particle X gradient to orchestrator'],
  [app, 'particleGradientY: nexusParamsRef.current.particleGradientY', 'App.tsx must pass particle Y gradient to orchestrator'],
  [app, 'particleSampleProfileMode: nexusParamsRef.current.particleSampleProfileMode', 'App.tsx must pass sample profile mode to orchestrator'],
  [app, 'ensureCollectiveMemoryFx', 'App.tsx must pass Collective Memory route ensure to orchestrator'],
  [app, 'transientDriveParticles: transientDriveSendsRef.current.particles', 'App.tsx must pass transient-drive particle send to orchestrator'],
  [app, 'collectiveMemoryParticles: collectiveFxRef.current.particles?.input', 'App.tsx must pass collective memory particle send to orchestrator'],
  [app, 'beginTransientEvent', 'App.tsx must pass transient entrypoint to orchestrator'],
  [app, 'getMainOutput: ensureFinalMixBus', 'App.tsx must pass existing final-mix resolver to orchestrator'],
  [app, 'playScheduledTone', 'App.tsx must pass existing scheduled-tone playback to orchestrator'],
  [app, 'playNoiseAccent: playParticleNoiseAccent', 'App.tsx must pass particle noise accent callback to orchestrator'],
  [app, 'triggerBodyExciter: triggerRoom3BodyExciter', 'App.tsx must pass Room III body exciter callback to orchestrator'],
];
for (const [content, needle, message] of mustContain) {
  if (!content.includes(needle)) failures.push(message);
}

const playMatch = app.match(/const playNexusAgentTone = \([\s\S]*?\n  const spawnNexusRipple = /);
if (!playMatch) {
  failures.push('Could not locate playNexusAgentTone slice in App.tsx');
} else {
  const playSlice = playMatch[0];
  const forbiddenInPlaySlice = [
    'resolveParticleAdmissionRequest({',
    'resolveParticleTonePlanningRequest({',
    'ensureParticleFxRoutes({',
    'buildParticleAuxTargets({',
    'assembleParticleRuntimePlaybackRequest({',
    'buildParticlePlaybackDispatchRuntime({',
    'dispatchParticlePlayback(',
    'const tonePlanning',
    'const particleRuntimeRequest',
    'const playbackRuntime',
    'const targetDestinations',
    'const volume = admission.volume',
  ];
  for (const needle of forbiddenInPlaySlice) {
    if (playSlice.includes(needle)) failures.push(`playNexusAgentTone still owns particle orchestration detail: ${needle}`);
  }
  if (!playSlice.includes('runParticleNexusToneOrchestrator({')) {
    failures.push('playNexusAgentTone must call the particle nexus tone orchestrator boundary');
  }
}

const forbiddenInBoundary = [
  'useRef(',
  'useState(',
  'useEffect(',
  'audioCtxRef',
  'nexusParamsRef',
  'transientDriveSendsRef',
  'psychedelicSpiralSendsRef',
  'collectiveFxRef',
  'schwarmdeuterSendsRef',
  'myzelPostFxSendsRef',
  'playParticleSample({',
  'playResidentSample({',
  'synthTonePlan.introTones.forEach',
  'synthTonePlan.mainTones.forEach',
  'getRefucktorVoiceAdmission(',
  'resolveParticlePlaybackRoute(',
  'resolveParticleSynthTonePlan({',
  'getParticleTransientDemand(',
];
for (const needle of forbiddenInBoundary) {
  if (boundary.includes(needle)) failures.push(`particle nexus tone orchestrator owns low-level or App-specific detail: ${needle}`);
}

if (failures.length) {
  console.error('[particle-nexus-tone-orchestrator-boundary] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[particle-nexus-tone-orchestrator-boundary] OK');
