#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const app = read('src/App.tsx');
const orchestratorPath = 'src/features/xensonar/audio/particleNexusToneOrchestrator.ts';
const orchestrator = fs.existsSync(path.join(root, orchestratorPath)) ? read(orchestratorPath) : '';
const host = `${app}\n${orchestrator}`;
const boundaryPath = 'src/features/xensonar/audio/particleAdmissionBoundary.ts';
const boundary = fs.existsSync(path.join(root, boundaryPath)) ? read(boundaryPath) : '';

const failures = [];
const mustContain = [
  [boundary, 'export function resolveParticleAdmissionRequest', 'particle admission request boundary export missing'],
  [boundary, 'export interface ParticleAdmissionRuntime', 'runtime contract interface missing'],
  [boundary, 'export interface ParticleAdmissionRequest', 'request contract interface missing'],
  [boundary, 'getRefucktorVoiceAdmission(', 'boundary must own the Refucktor voice-admission call'],
  [boundary, "sourceKind === 'resident' ? 'resident-synth-tone' : 'particle-synth-tone'", 'boundary must preserve resident/particle pressure-source mapping'],
  [boundary, "runtime.recordAudioPressureCount(source, 'voice-rejected', 1)", 'boundary must record rejected voices'],
  [boundary, "runtime.recordAudioPressureCount(source, 'voice-admitted', 1)", 'boundary must record admitted voices'],
  [boundary, 'request.volume * admission.volumeScale', 'boundary must preserve Refucktor volume scaling'],
  [boundary, 'PARTICLE_ADMISSION_MIN_VOLUME = 0.0005', 'boundary must preserve the low-volume rejection threshold'],
  [host, 'resolveParticleAdmissionRequest({', 'particle nexus tone path must delegate particle admission into boundary'],
  [app, 'guardState: refucktorAudioGuardRef.current', 'App.tsx must pass the existing Refucktor guard state toward admission boundary'],
  [host, 'const volume = admission.volume', 'particle nexus tone path must use the boundary-scaled volume'],
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
    'getRefucktorVoiceAdmission(',
    'admission.volumeScale',
    'voice-rejected", 1',
    'voice-admitted", 1',
    'volume <= 0.0005',
    'sourceKind === "resident" ? "resident-synth-tone" : "particle-synth-tone"',
    'resolveParticleAdmissionRequest({',
  ];
  for (const needle of forbiddenInPlaySlice) {
    if (playSlice.includes(needle)) failures.push(`playNexusAgentTone still owns particle admission detail: ${needle}`);
  }
  if (!playSlice.includes('runParticleNexusToneOrchestrator({')) {
    failures.push('playNexusAgentTone must reach particle admission through the nexus tone orchestrator');
  }
}

const forbiddenInBoundary = [
  'useRef(',
  'useState(',
  'useEffect(',
  'audioCtxRef',
  'nexusParamsRef',
  'resolveParticlePlaybackRoute',
  'resolveParticleSynthTonePlan',
  'ensureParticleFxRoutes',
  'buildParticleAuxTargets',
  'beginTransientEvent',
  'dispatchParticlePlayback',
  'playParticleSample',
  'playResidentSample',
  'playScheduledTone',
  'triggerRoom3BodyExciter',
];
for (const needle of forbiddenInBoundary) {
  if (boundary.includes(needle)) failures.push(`particle admission boundary owns non-admission detail: ${needle}`);
}

if (failures.length) {
  console.error('[particle-admission-boundary] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[particle-admission-boundary] OK');
