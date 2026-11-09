#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const app = read('src/App.tsx');
const boundaryPath = 'src/features/xensonar/audio/particleSynthTonePlan.ts';
const boundary = fs.existsSync(path.join(root, boundaryPath)) ? read(boundaryPath) : '';
const dispatchPath = 'src/features/xensonar/audio/particlePlaybackDispatch.ts';
const dispatch = fs.existsSync(path.join(root, dispatchPath)) ? read(dispatchPath) : '';
const planningPath = 'src/features/xensonar/audio/particleTonePlanningRequestBoundary.ts';
const planning = fs.existsSync(path.join(root, planningPath)) ? read(planningPath) : '';
const planConsumer = `${app}\n${dispatch}\n${planning}`;

const failures = [];
const mustContain = [
  [boundary, 'export function resolveParticleSynthTonePlan', 'particle synth tone plan boundary export missing'],
  [boundary, 'export type ParticleScheduledTonePlan', 'boundary must export scheduled tone plan contract'],
  [boundary, 'sampleRoute: boolean', 'boundary must distinguish sample route from synth route without owning playback'],
  [boundary, "preset === 'glass_ping'", 'boundary must own particle preset tone branching'],
  [boundary, "preset === 'granular_spark'", 'boundary must preserve granular spark tone plan'],
  [boundary, 'noiseAccentVolumeScale = 0.72', 'boundary must preserve sample-route noise accent scale'],
  [boundary, 'noiseAccentVolumeScale = 1', 'boundary must preserve synth-route noise accent scale'],
  [`${app}\n${planning}`, 'resolveParticleSynthTonePlan({', 'App/particle tone-planning path must delegate into particle synth tone plan boundary'],
  [planConsumer, 'synthTonePlan.introTones.forEach(playParticleToneSpec)', 'particle playback path must consume intro tone specs through the plan'],
  [planConsumer, 'synthTonePlan.mainTones.forEach(playParticleToneSpec)', 'particle playback path must consume main tone specs through the plan'],
  [planConsumer, 'synthTonePlan.noiseAccentVolumeScale !== null', 'particle playback path must consume noise accent scaling through the plan'],
];
for (const [content, needle, message] of mustContain) {
  if (!content.includes(needle)) failures.push(message);
}

const forbiddenInApp = [
  'const brightnessCutoff = 700 + sitarBias * 4200 + psyBias * 900',
  'const sitarBuzzType: OscillatorType = sitarBias > 0.62 ? "sawtooth" : "square"',
  'const psyShineType: OscillatorType = psyBias > 0.7 ? "square" : "triangle"',
  'if (preset === "glass_ping")',
  'else if (preset === "granular_spark")',
  'else if (preset === "woodblock")',
];
for (const needle of forbiddenInApp) {
  if (app.includes(needle)) failures.push(`App.tsx still owns particle synth tone plan detail: ${needle}`);
}

const forbiddenInBoundary = [
  'useRef(',
  'useState(',
  'useEffect(',
  'audioCtxRef',
  'nexusParamsRef',
  'playScheduledTone',
  'playParticleNoiseAccent',
  'playParticleSample',
  'playResidentSample',
  'beginTransientEvent',
  'triggerRoom3BodyExciter',
];
for (const needle of forbiddenInBoundary) {
  if (boundary.includes(needle)) failures.push(`particle synth tone plan boundary owns runtime/playback detail: ${needle}`);
}

if (failures.length) {
  console.error('[particle-synth-tone-plan-boundary] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[particle-synth-tone-plan-boundary] OK');
