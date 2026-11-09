#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const app = read('src/App.tsx');
const orchestratorPath = 'src/features/xensonar/audio/particleNexusToneOrchestrator.ts';
const orchestrator = fs.existsSync(path.join(root, orchestratorPath)) ? read(orchestratorPath) : '';
const host = `${app}\n${orchestrator}`;
const boundaryPath = 'src/features/xensonar/audio/particleTonePlanningRequestBoundary.ts';
const boundary = fs.existsSync(path.join(root, boundaryPath)) ? read(boundaryPath) : '';

const failures = [];
const mustContain = [
  [boundary, 'export function resolveParticleTonePlanningRequest', 'particle tone-planning request boundary export missing'],
  [boundary, 'export interface ParticleTonePlanningRuntime', 'runtime contract interface missing'],
  [boundary, 'export interface ParticleTonePlanningRequest', 'request contract interface missing'],
  [boundary, 'export interface ParticleTonePlanningResult', 'result contract interface missing'],
  [boundary, 'resolveParticlePlaybackRoute(selectionId)', 'boundary must own particle playback route resolution'],
  [boundary, 'computeParticleGradientAxes(', 'boundary must own particle gradient-axis computation'],
  [boundary, 'resolveParticleSynthTonePlan({', 'boundary must own synth tone-plan preparation'],
  [boundary, 'const selectionId = request.presetOverride ?? request.particlePreset', 'boundary must preserve preset override fallback'],
  [boundary, 'const offset = request.when !== undefined ? Math.max(0, request.when - runtime.currentTimeSec) : 0', 'boundary must preserve scheduled offset formula'],
  [boundary, "sampleRoute: playbackRoute.kind === 'sample'", 'boundary must preserve sample-route synth-plan flag'],
  [boundary, 'synthPresetId: playbackRoute.synthPresetId', 'boundary must return synth preset id for transient demand'],
  [host, 'resolveParticleTonePlanningRequest({', 'particle nexus tone path must delegate particle tone planning into boundary'],
  [app, 'particlePreset: nexusParamsRef.current.particlePreset', 'App.tsx must pass current particle preset toward tone-planning boundary'],
  [app, 'particleGradientX: nexusParamsRef.current.particleGradientX', 'App.tsx must pass X gradient contract toward tone-planning boundary'],
  [app, 'particleGradientY: nexusParamsRef.current.particleGradientY', 'App.tsx must pass Y gradient contract toward tone-planning boundary'],
  [host, 'tonePlanning', 'particle nexus tone path must pass boundary tone-planning result into runtime request assembly'],
  [host, 'assembleParticleRuntimePlaybackRequest({', 'particle nexus tone path must use boundary tone-planning result before playback dispatch'],
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
    'resolveParticlePlaybackRoute(selectionId)',
    'computeParticleGradientAxes(',
    'resolveParticleSynthTonePlan({',
    'const selectionId = presetOverride ?? nexusParamsRef.current.particlePreset',
    'const offset = when !== undefined ? Math.max(0, when - ctx.currentTime) : 0',
    'sampleRoute: particlePlaybackRoute.kind === "sample"',
    'resolveParticleTonePlanningRequest({',
    'tonePlanning,',
    'dispatchParticlePlayback(',
  ];
  for (const needle of forbiddenInPlaySlice) {
    if (playSlice.includes(needle)) failures.push(`playNexusAgentTone still owns particle tone-planning detail: ${needle}`);
  }
  if (!playSlice.includes('runParticleNexusToneOrchestrator({')) {
    failures.push('playNexusAgentTone must reach particle tone planning through the nexus tone orchestrator');
  }
}

const sequence = [
  'resolveParticleAdmissionRequest({',
  'resolveParticleTonePlanningRequest({',
  'ensureParticleFxRoutes({',
  'assembleParticleRuntimePlaybackRequest({',
  'dispatchParticlePlayback(',
];
let last = -1;
for (const needle of sequence) {
  const idx = orchestrator.indexOf(needle);
  if (idx < 0) failures.push(`orchestrator missing ordered tone-planning step: ${needle}`);
  if (idx >= 0 && idx < last) failures.push(`orchestrator particle tone-planning order regressed at: ${needle}`);
  if (idx >= 0) last = idx;
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
  'ensureParticleFxRoutes',
  'buildParticleAuxTargets',
  'beginTransientEvent',
  'getParticleTransientDemand',
  'dispatchParticlePlayback',
  'getRefucktorVoiceAdmission',
  'playParticleSample',
  'playResidentSample',
  'playScheduledTone',
  'triggerRoom3BodyExciter',
];
for (const needle of forbiddenInBoundary) {
  if (boundary.includes(needle)) failures.push(`particle tone-planning boundary owns non-planning detail: ${needle}`);
}

if (failures.length) {
  console.error('[particle-tone-planning-request-boundary] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[particle-tone-planning-request-boundary] OK');
