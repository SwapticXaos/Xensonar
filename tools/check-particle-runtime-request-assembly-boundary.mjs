#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const app = read('src/App.tsx');
const orchestratorPath = 'src/features/xensonar/audio/particleNexusToneOrchestrator.ts';
const orchestrator = fs.existsSync(path.join(root, orchestratorPath)) ? read(orchestratorPath) : '';
const host = `${app}\n${orchestrator}`;
const boundaryPath = 'src/features/xensonar/audio/particleRuntimeRequestAssemblyBoundary.ts';
const boundary = fs.existsSync(path.join(root, boundaryPath)) ? read(boundaryPath) : '';

const failures = [];
const mustContain = [
  [boundary, 'export function assembleParticleRuntimePlaybackRequest', 'particle runtime request assembly boundary export missing'],
  [boundary, 'export interface ParticleRuntimeRequestAssemblyRuntime', 'runtime contract interface missing'],
  [boundary, 'export interface ParticleRuntimeRequestAssemblyInput', 'input contract interface missing'],
  [boundary, 'export interface ParticleRuntimeRequestAssemblyResult', 'result contract interface missing'],
  [boundary, "DEFAULT_PARTICLE_SAMPLE_PROFILE_MODE: ParticleSampleProfileMode = 'current_db_v2'", 'boundary must own default particle sample profile mode'],
  [boundary, 'getParticleTransientDemand(tonePlanning.synthPresetId)', 'boundary must preserve planned-preset transient demand'],
  [boundary, "runtime.beginTransientEvent(\n    'particle'", 'boundary must own particle transient-plan creation'],
  [boundary, 'volume * (0.84 + brightness * 0.26 + attackHardness * 0.14)', 'boundary must preserve transient intensity formula'],
  [boundary, 'plan.bodyScale >= 0.84 ? 4 : plan.bodyScale >= 0.56 ? 2 : 1', 'boundary must preserve body voice-budget thresholds'],
  [boundary, 'sampleProfileMode = input.sampleProfileMode ?? DEFAULT_PARTICLE_SAMPLE_PROFILE_MODE', 'boundary must preserve sample-profile fallback'],
  [boundary, 'dispatchRequest: {', 'boundary must assemble a dispatch request'],
  [boundary, 'presetRoute: tonePlanning.playbackRoute', 'boundary must preserve playback route forwarding'],
  [boundary, 'synthTonePlan: tonePlanning.synthTonePlan', 'boundary must preserve synth tone-plan forwarding'],
  [boundary, 'axes: tonePlanning.axes', 'boundary must preserve gradient-axis forwarding'],
  [host, 'assembleParticleRuntimePlaybackRequest({', 'particle nexus tone path must delegate particle runtime request assembly'],
  [host, 'beginTransientEvent', 'particle nexus tone path must pass existing transient runtime entrypoint into assembly boundary'],
  [host, 'tonePlanning', 'particle nexus tone path must pass tone-planning result into assembly boundary'],
  [app, 'particleSampleProfileMode: nexusParamsRef.current.particleSampleProfileMode', 'App.tsx must pass current particle sample profile mode toward assembly boundary'],
  [host, 'particleRuntimeRequest.dispatchRequest', 'particle nexus tone path must pass assembled dispatch request into playback boundary'],
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
    'getParticleTransientDemand(',
    'const particlePlan = beginTransientEvent("particle"',
    'const particleBodyVoiceBudget =',
    'particlePlan.bodyScale >= 0.84',
    'const { brightness, attackHardness } =',
    "sampleProfileMode: (nexusParamsRef.current.particleSampleProfileMode ?? 'current_db_v2')",
    'transientPlan: particlePlan',
    'bodyVoiceBudget: particleBodyVoiceBudget',
    'assembleParticleRuntimePlaybackRequest({',
    'dispatchParticlePlayback(',
  ];
  for (const needle of forbiddenInPlaySlice) {
    if (playSlice.includes(needle)) failures.push(`playNexusAgentTone still owns particle runtime request assembly detail: ${needle}`);
  }
  if (!playSlice.includes('runParticleNexusToneOrchestrator({')) {
    failures.push('playNexusAgentTone must reach particle runtime request assembly through the nexus tone orchestrator');
  }
}

const sequence = [
  'resolveParticleTonePlanningRequest({',
  'ensureParticleFxRoutes({',
  'buildParticleAuxTargets({',
  'assembleParticleRuntimePlaybackRequest({',
  'buildParticlePlaybackDispatchRuntime({',
  'dispatchParticlePlayback(',
];
let last = -1;
for (const needle of sequence) {
  const idx = orchestrator.indexOf(needle);
  if (idx < 0) failures.push(`orchestrator missing ordered runtime assembly step: ${needle}`);
  if (idx >= 0 && idx < last) failures.push(`orchestrator particle runtime order regressed at: ${needle}`);
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
  'dispatchParticlePlayback(',
  'playParticleSample',
  'playResidentSample',
  'playScheduledTone',
  'triggerRoom3BodyExciter',
  'getRefucktorVoiceAdmission',
];
for (const needle of forbiddenInBoundary) {
  if (boundary.includes(needle)) failures.push(`particle runtime request assembly boundary owns non-assembly detail: ${needle}`);
}

if (failures.length) {
  console.error('[particle-runtime-request-assembly-boundary] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[particle-runtime-request-assembly-boundary] OK');
