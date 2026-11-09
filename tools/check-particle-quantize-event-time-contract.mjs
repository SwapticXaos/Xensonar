#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const app = readFileSync('src/App.tsx', 'utf8');
const particleLane = readFileSync('src/features/xensonar/rooms/resonanceParticleSimulationLane.ts', 'utf8');
const runtime = readFileSync('src/features/xensonar/audioTraffic/quantizedCollisionRuntime.ts', 'utf8');
const quantize = readFileSync('src/features/xensonar/rooms/audioTrafficQuantize.ts', 'utf8');
const types = readFileSync('src/features/xensonar/types.ts', 'utf8');
const domainTypes = readFileSync('src/features/xensonar/domain/runtimeTypes.ts', 'utf8');

const checks = [
  ['NexusAgent exposes optional lastHitAudioTimeSec', types.includes('lastHitAudioTimeSec?: number')],
  ['Runtime NexusAgent mirror exposes optional lastHitAudioTimeSec', domainTypes.includes('lastHitAudioTimeSec?: number')],
  ['Ring particle collision stamps audio time', app.includes('agent.lastHitAudioTimeSec = getAudioNowSec(audioCtxRef.current ?? audioCtx);') || particleLane.includes('agent.lastHitAudioTimeSec = audioNowSec();')],
  ['Quantized collision runtime reads hit audio time', runtime.includes('lastHitAudioTimeSec') && runtime.includes('const hitAudioTimeSec =')],
  ['Quantized schedule receives eventTimeSec', runtime.includes('eventTimeSec: hitAudioTimeSec')],
  ['Quantize scheduler supports eventTimeSec', quantize.includes('eventTimeSec?: number | null')],
  ['Quantize scheduler has missed-grid catchup', quantize.includes('QUANTIZED_TRAFFIC_MISSED_GRID_CATCHUP_GRACE_SEC') && quantize.includes("mode: 'catchup'")],
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error('Particle quantize event-time contract failed:');
  for (const [name] of failed) console.error(`- ${name}`);
  process.exit(1);
}
console.log('Particle quantize event-time contract OK');
