#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const roomPath = 'src/features/xensonar/family/refactor/XensonarRefactorRoom.tsx';
const keyboardPath = 'src/features/xensonar/family/refactor/useXensonarRefactorKeyboardScope.ts';
const simulationPath = 'src/features/xensonar/family/refactor/xensonarRefactorSimulationFrame.ts';
const framePath = 'src/features/xensonar/family/refactor/useXensonarRefactorFrameRuntime.ts';
const audioPath = 'src/features/xensonar/family/refactor/useXensonarRefactorAudioRuntime.ts';

const room = read(roomPath);
const keyboard = read(keyboardPath);
const simulation = read(simulationPath);
const frame = read(framePath);
const audio = read(audioPath);
const failures = [];
const requireIn = (label, source, needle) => { if (!source.includes(needle)) failures.push(`${label}: missing ${needle}`); };
const forbidIn = (label, source, needle) => { if (source.includes(needle)) failures.push(`${label}: must not contain ${needle}`); };

const roomLines = room.split(/\r?\n/).length;
if (roomLines > 600) failures.push(`room: expected <= 600 lines after runtime ownership split, got ${roomLines}`);

for (const owner of [
  'useXensonarRefactorKeyboardScope',
  'runXensonarRefactorSimulationFrame',
  'useXensonarRefactorFrameRuntime',
  'useXensonarRefactorAudioRuntime',
]) requireIn('room', room, owner);

forbidIn('room', room, 'new AudioContext()');
forbidIn('room', room, 'createDynamicsCompressor()');
forbidIn('room', room, 'requestAnimationFrame(');
forbidIn('room', room, 'window.addEventListener("keydown"');
forbidIn('room', room, 'for (const ripple of ripplesRef.current)');

requireIn('keyboard', keyboard, 'window.addEventListener("keydown", down, { passive: false })');
requireIn('keyboard', keyboard, 'if (key === "y") return void spawnDirectedPulse("left")');
requireIn('keyboard', keyboard, 'keyboardWindowFrequency(');

const simulationOrder = [
  'ripplesRef.current = ripplesRef.current',
  'pulsesRef.current = pulsesRef.current',
  'const agents = agentsRef.current;',
  'if (sharedField?.active) {',
  'transportBeatRef.current = beat;',
];
let previous = -1;
for (const marker of simulationOrder) {
  const index = simulation.indexOf(marker);
  if (index < 0) failures.push(`simulation: missing ${marker}`);
  if (index >= 0 && index <= previous) failures.push(`simulation: frame ordering changed around ${marker}`);
  previous = Math.max(previous, index);
}

const frameOrder = ['syncSharedField();', 'if (powered) stepSimulation(dt, now);', 'draw();', 'requestAnimationFrame(loop)'];
previous = -1;
for (const marker of frameOrder) {
  const index = frame.indexOf(marker);
  if (index < 0) failures.push(`frame runtime: missing ${marker}`);
  if (index >= 0 && index <= previous) failures.push(`frame runtime: ordering changed around ${marker}`);
  previous = Math.max(previous, index);
}

for (const marker of [
  'const audioRef = useRef<AudioContext | null>(null);',
  'new AudioContext()',
  'const compressor = ctx.createDynamicsCompressor();',
  'createEcho(ctx)',
  'createDroneVoice(',
  'scheduleParticleVoice(',
  'scheduleWaveStartVoice(',
  'openRefucktorPowerGate(',
  'closeRefucktorPowerGate(',
]) requireIn('audio runtime', audio, marker);
forbidIn('audio runtime', audio, 'requestAnimationFrame(');
forbidIn('audio runtime', audio, 'window.addEventListener("keydown"');

if (failures.length) {
  console.error('[check-refucktor-runtime-ownership-boundaries] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`[check-refucktor-runtime-ownership-boundaries] PASS roomLines=${roomLines}`);
