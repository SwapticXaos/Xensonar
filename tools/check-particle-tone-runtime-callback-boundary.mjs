#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const app = read('src/App.tsx');
const orchestratorPath = 'src/features/xensonar/audio/particleNexusToneOrchestrator.ts';
const orchestrator = fs.existsSync(path.join(root, orchestratorPath)) ? read(orchestratorPath) : '';
const host = `${app}\n${orchestrator}`;
const boundaryPath = 'src/features/xensonar/audio/particleToneRuntimeCallbackBoundary.ts';
const boundary = fs.existsSync(path.join(root, boundaryPath)) ? read(boundaryPath) : '';

const failures = [];
const mustContain = [
  [boundary, 'export type ParticleBaseScheduledTonePlayback', 'base scheduled-tone playback callback type missing'],
  [boundary, 'export interface ParticleToneRuntimeCallbackBoundaryInput', 'callback boundary input interface missing'],
  [boundary, 'export function adaptParticleScheduledTonePlayback', 'scheduled-tone adapter export missing'],
  [boundary, 'export function buildParticlePlaybackDispatchRuntime', 'dispatch-runtime builder export missing'],
  [boundary, 'ParticlePlaybackDispatchRuntime', 'boundary must return the particle playback dispatch runtime contract'],
  [boundary, 'tone.freq', 'boundary must preserve scheduled-tone freq forwarding'],
  [boundary, 'tone.offset', 'boundary must preserve scheduled-tone offset forwarding'],
  [boundary, 'tone.dur', 'boundary must preserve scheduled-tone duration forwarding'],
  [boundary, 'tone.type', 'boundary must preserve scheduled-tone oscillator type forwarding'],
  [boundary, 'tone.volume', 'boundary must preserve scheduled-tone volume forwarding'],
  [boundary, 'tone.q', 'boundary must preserve scheduled-tone Q forwarding'],
  [boundary, 'tone.cutoff', 'boundary must preserve scheduled-tone cutoff forwarding'],
  [boundary, 'targetDestinations', 'boundary must preserve target destination forwarding'],
  [boundary, 'options', 'boundary must preserve transient tone options forwarding'],
  [boundary, 'playNoiseAccent: input.playNoiseAccent', 'boundary must preserve particle noise-accent callback forwarding'],
  [boundary, 'triggerBodyExciter: input.triggerBodyExciter', 'boundary must preserve room3 body-exciter callback forwarding'],
  [boundary, 'recordAudioPressureCount: input.recordAudioPressureCount', 'boundary must preserve audio-pressure counter forwarding'],
  [host, 'buildParticlePlaybackDispatchRuntime({', 'particle nexus tone path must build playback runtime through callback boundary'],
  [app, 'playScheduledTone,', 'App.tsx must pass existing scheduled-tone callback toward callback boundary'],
  [app, 'playNoiseAccent: playParticleNoiseAccent', 'App.tsx must pass existing particle noise-accent callback toward callback boundary'],
  [app, 'triggerBodyExciter: triggerRoom3BodyExciter', 'App.tsx must pass existing body-exciter callback toward callback boundary'],
  [host, 'dispatchParticlePlayback(playbackRuntime, particleRuntimeRequest.dispatchRequest)', 'particle nexus tone path must dispatch using the built particle playback runtime'],
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
    'playScheduledTone: (tone, destinations, options) => playScheduledTone(',
    'tone.freq,',
    'tone.offset,',
    'tone.dur,',
    'tone.type,',
    'tone.volume,',
    'tone.q,',
    'tone.cutoff,',
    'buildParticlePlaybackDispatchRuntime({',
    'dispatchParticlePlayback(',
  ];
  for (const needle of forbiddenInPlaySlice) {
    if (playSlice.includes(needle)) failures.push(`playNexusAgentTone still owns particle scheduled-tone callback adapter detail: ${needle}`);
  }
  if (!playSlice.includes('runParticleNexusToneOrchestrator({')) {
    failures.push('playNexusAgentTone must reach particle callback runtime through the nexus tone orchestrator');
  }
}

const sequence = [
  'assembleParticleRuntimePlaybackRequest({',
  'buildParticlePlaybackDispatchRuntime({',
  'dispatchParticlePlayback(',
];
let last = -1;
for (const needle of sequence) {
  const idx = orchestrator.indexOf(needle);
  if (idx < 0) failures.push(`orchestrator missing ordered callback-runtime step: ${needle}`);
  if (idx >= 0 && idx < last) failures.push(`orchestrator particle callback order regressed at: ${needle}`);
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
  'assembleParticleRuntimePlaybackRequest',
  'beginTransientEvent',
  'getParticleTransientDemand',
  'getRefucktorVoiceAdmission',
  'playParticleSample',
  'playResidentSample',
  'playParticleNoiseAccentWithLifecycle',
  'triggerRoom3BodyExciterPlayback',
  'playScheduledToneWithLifecycle',
];
for (const needle of forbiddenInBoundary) {
  if (boundary.includes(needle)) failures.push(`particle tone runtime callback boundary owns non-callback detail: ${needle}`);
}

if (failures.length) {
  console.error('[particle-tone-runtime-callback-boundary] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[particle-tone-runtime-callback-boundary] OK');
