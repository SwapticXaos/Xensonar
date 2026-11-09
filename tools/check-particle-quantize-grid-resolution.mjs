#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const runtime = readFileSync('src/features/xensonar/audioTraffic/quantizedCollisionRuntime.ts', 'utf8');
const sharedTime = readFileSync('src/features/xensonar/audioTraffic/sharedAudioTimeContract.ts', 'utf8');
const math = readFileSync('src/features/xensonar/rooms/resonanceRuntimeMath.ts', 'utf8');
const panel = readFileSync('src/features/xensonar/rooms/ResonanceTimingEchoControls.tsx', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');

const checks = [
  [
    'Particle runtime must pass the real shared quantize step into the scheduler, not clamp it to the 8ms scheduling lead window.',
    runtime.includes('stepSec: step,') && !runtime.includes('stepSec: Math.min(step, 0.008)'),
  ],
  [
    'Particle runtime receives the polymetric reference length from App.',
    runtime.includes('quantizeReferenceBars?: number') && runtime.includes('quantizeReferenceBars: args.quantizeReferenceBars'),
  ],
  [
    'Shared time derives quantize step from grid and reference bars.',
    sharedTime.includes('quantizeReferenceBars') && sharedTime.includes('getQuantizeStepSeconds(bpm, args.quantizeGrid, quantizeReferenceBars)'),
  ],
  [
    'Quantize math uses bar duration divided by slot count, not the legacy 16/32/64 divisor switch.',
    math.includes('return (240 / safeBpm) * safeReferenceBars / safeGrid;') && !math.includes('grid === 16 ? 4'),
  ],
  [
    'Particle UI exposes polymetric reference bars.',
    panel.includes('particleQuantizeReferenceBars') && panel.includes('onQuantizeReferenceBarsChange'),
  ],
  [
    'App passes particle quantize reference bars to the collision runtime.',
    app.includes('const [particleQuantizeReferenceBars, setParticleQuantizeReferenceBars]') && app.includes('quantizeReferenceBars: particleQuantizeReferenceBars'),
  ],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error('Particle quantize grid-resolution contract failed:');
  for (const [name] of failed) console.error(`- ${name}`);
  process.exit(1);
}

console.log('Particle quantize grid-resolution contract OK');
