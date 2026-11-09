#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';

const failures = [];
const read = (path) => readFileSync(path, 'utf8');
const requireFile = (path) => { if (!existsSync(path)) failures.push(`missing ${path}`); };
const requireContains = (path, needle, msg = '') => {
  const text = read(path);
  if (!text.includes(needle)) failures.push(`${path} missing ${needle}${msg ? ` · ${msg}` : ''}`);
};
const requireNotContains = (path, needle, msg = '') => {
  const text = read(path);
  if (text.includes(needle)) failures.push(`${path} still contains ${needle}${msg ? ` · ${msg}` : ''}`);
};

requireFile('src/features/xensonar/rooms/resonanceParticleSimulationLane.ts');
requireFile('src/features/xensonar/rooms/resonanceParticleSimulationClock.ts');
requireFile('src/features/xensonar/rooms/resonanceFieldMotionClock.ts');
requireContains('src/App.tsx', 'advanceResonanceParticleSimulationLane({', 'App should delegate particle movement/collision/audio-intent to lane.');
requireContains('src/App.tsx', 'renderResonanceParticleSimulationLane({', 'App should delegate particle drawing to lane.');
requireContains('src/App.tsx', 'resolveResonanceParticleSimulationFrame(', 'Particle time contract must be explicit.');
requireContains('src/App.tsx', 'resolveResonanceFieldMotionFrame(', 'Wave/field time contract must be explicit.');
requireContains('src/App.tsx', 'performancePolicy: performanceCrisisRuntimePolicy.particles', 'Lane must receive active Performance & Krisenmanagement policy.');
requireContains('src/features/xensonar/rooms/particleAudioIntentShaper.ts', 'lastAudioIntentHit', 'Shaper commit must preserve audio-intent event truth.');
requireContains('src/features/xensonar/rooms/resonanceParticleSimulationLane.ts', 'selectParticleAudioIntentCandidates', 'Lane must use the shared Partikel Manager shaper.');
requireContains('src/features/xensonar/rooms/resonanceParticleSimulationLane.ts', 'particleMotionScale', 'Lane must not be tied to raw render-frame count.');
requireContains('src/features/xensonar/rooms/resonanceParticleSimulationClock.ts', 'maxParticleScale', 'Particle clock must bound catch-up.');
requireContains('src/features/xensonar/rooms/resonanceFieldMotionClock.ts', 'noCatchupScale', 'Field waves must remain no-catch-up by default.');

requireNotContains('src/App.tsx', 'const particleAudioIntentCandidates: ParticleAudioIntentCandidate[] = []', 'candidate collection belongs in resonanceParticleSimulationLane.');
requireNotContains('src/App.tsx', 'state.agents.forEach((agent, aIdx) => {', 'particle movement loop belongs in resonanceParticleSimulationLane.');
requireNotContains('src/App.tsx', 'spawnAgentImpactRipple(aIdx, agent.x, agent.y)', 'impact-ripple spawn belongs in resonanceParticleSimulationLane.');
requireNotContains('src/App.tsx', 'const hitGlow = Math.max(0, 1 - (performance.now() - agent.lastHit) * 0.002)', 'agent rendering belongs in resonanceParticleSimulationLane.');
requireNotContains('src/App.tsx', 'commitParticleAudioIntent({', 'App must not directly commit particle audio intents.');

const appLines = read('src/App.tsx').split('\n').length;
if (appLines >= 7765) failures.push(`App.tsx ${appLines} lines; expected below 6.8.7 baseline (7765) after particle lane extraction.`);

if (failures.length) {
  console.error('[particle-simulation-lane-boundary] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`[particle-simulation-lane-boundary] ok · App.tsx ${appLines} lines`);
