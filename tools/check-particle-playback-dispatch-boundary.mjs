#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const app = read('src/App.tsx');
const orchestratorPath = 'src/features/xensonar/audio/particleNexusToneOrchestrator.ts';
const orchestrator = fs.existsSync(path.join(root, orchestratorPath)) ? read(orchestratorPath) : '';
const host = `${app}\n${orchestrator}`;
const boundaryPath = 'src/features/xensonar/audio/particlePlaybackDispatch.ts';
const boundary = fs.existsSync(path.join(root, boundaryPath)) ? read(boundaryPath) : '';

const failures = [];
const mustContain = [
  [boundary, 'export function dispatchParticlePlayback', 'particle playback dispatch boundary export missing'],
  [boundary, 'export interface ParticlePlaybackDispatchRuntime', 'runtime contract interface missing'],
  [boundary, 'export interface ParticlePlaybackDispatchRequest', 'request contract interface missing'],
  [boundary, 'getParticleBodyExciterProfile(presetRoute.synthPresetId, axes)', 'boundary must preserve particle body-exciter profile route'],
  [boundary, 'runtime.triggerBodyExciter(', 'boundary must preserve body exciter trigger call'],
  [boundary, 'playResidentSample({', 'boundary must preserve resident elastic sample route'],
  [boundary, 'elasticPitchStable: true', 'boundary must preserve resident elastic-pitch-stable flag'],
  [boundary, 'playParticleSample({', 'boundary must preserve particle sample playback route'],
  [boundary, 'profileMode: request.sampleProfileMode', 'boundary must preserve particle sample profile mode forwarding'],
  [boundary, 'synthTonePlan.introTones.forEach(playParticleToneSpec)', 'boundary must dispatch intro tones'],
  [boundary, 'synthTonePlan.mainTones.forEach(playParticleToneSpec)', 'boundary must dispatch main synth tones'],
  [boundary, 'runtime.playNoiseAccent(', 'boundary must preserve particle noise-accent dispatch'],
  [host, 'dispatchParticlePlayback(', 'particle nexus tone path must delegate particle playback dispatch into boundary'],
  [host, 'particleRuntimeRequest.dispatchRequest', 'particle nexus tone path must pass assembled request into playback boundary'],
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
    'playParticleSample({',
    'playResidentSample({',
    'synthTonePlan.introTones.forEach',
    'synthTonePlan.mainTones.forEach',
    'triggerRoom3BodyExciter(getParticleBodyExciterProfile',
    'const playParticleToneSpec =',
    'const particleToneOptions =',
    'dispatchParticlePlayback(',
    'assembleParticleRuntimePlaybackRequest({',
    'ensureParticleFxRoutes({',
    'buildParticleAuxTargets({',
  ];
  for (const needle of forbiddenInPlaySlice) {
    if (playSlice.includes(needle)) failures.push(`playNexusAgentTone still owns particle playback dispatch detail: ${needle}`);
  }
  if (!playSlice.includes('runParticleNexusToneOrchestrator({')) {
    failures.push('playNexusAgentTone must reach particle playback dispatch through the nexus tone orchestrator');
  }
}

const forbiddenInBoundary = [
  'useRef(',
  'useState(',
  'useEffect(',
  'nexusParamsRef',
  'transientDriveSendsRef',
  'psychedelicSpiralSendsRef',
  'collectiveFxRef',
  'schwarmdeuterSendsRef',
  'myzelPostFxSendsRef',
  'ensureParticleFxRoutes',
  'buildParticleAuxTargets',
  'beginTransientEvent',
  'getParticleTransientDemand',
  'getRefucktorVoiceAdmission',
];
for (const needle of forbiddenInBoundary) {
  if (boundary.includes(needle)) failures.push(`particle playback dispatch boundary owns App/runtime admission detail: ${needle}`);
}

if (failures.length) {
  console.error('[particle-playback-dispatch-boundary] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[particle-playback-dispatch-boundary] OK');
