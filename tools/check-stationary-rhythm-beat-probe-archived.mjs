#!/usr/bin/env node
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const failures = [];
const requireText = (label, content, needle) => {
  if (!content.includes(needle)) failures.push(`${label} missing ${needle}`);
};
const forbidText = (label, content, needle) => {
  if (content.includes(needle)) failures.push(`${label} must not contain ${needle}`);
};

const pkg = JSON.parse(read('package.json'));
if (!['3.2.91.6.9.190.13', '3.2.91.7.0.3', '3.2.91.7.1'].includes(pkg.version)) failures.push(`package version is ${pkg.version}`);
if (!pkg.scripts?.['xensonar:check-stationary-rhythm-beat-probe-archived']) {
  failures.push('package.json missing xensonar:check-stationary-rhythm-beat-probe-archived');
}

const overlay = read('src/features/xensonar/audio/StationaryRhythmWorkletProbeOverlay.tsx');
requireText('StationaryRhythmWorkletProbeOverlay', overlay, 'return null');
requireText('StationaryRhythmWorkletProbeOverlay', overlay, 'Historical stationary-rhythm audition overlay');
for (const forbidden of [
  'Beat-Probe starten',
  'Beat-Probe stoppen',
  'onClick={onToggleProbe}',
  'summarizeStationaryRhythmProbeStatus',
]) forbidText('StationaryRhythmWorkletProbeOverlay', overlay, forbidden);

const hook = read('src/features/xensonar/audio/useStationaryRhythmWorkletProbeController.ts');
requireText('useStationaryRhythmWorkletProbeController', hook, 'Cold compatibility hook');
requireText('useStationaryRhythmWorkletProbeController', hook, 'createInitialStationaryRhythmWorkletSnapshot');
for (const forbidden of [
  'createStationaryRhythmWorkletLaneBridge',
  'resolveStationaryRhythmProbeOptions',
  'publishStationaryRhythmWorkletPressureFromSnapshot',
  'buildStationaryRhythmPatternSnapshot',
  '.startProbe(',
  '.updateProbe(',
  '.stopProbe(',
  'ensureAudioReadyRef',
  'bridgeRef',
]) forbidText('useStationaryRhythmWorkletProbeController', hook, forbidden);

const manifest = read('docs/MERGE_READINESS_3.2.91.6.9.190.7_audio_branch.md');
for (const marker of [
  'Nachtrag 9.190.12',
  'Beat-Probe starten',
  'Cold compatibility hook',
  'kein AudioContext angefordert',
  'keine Worklet-Bridge erzeugt',
]) requireText('merge readiness manifest', manifest, marker);

if (failures.length) {
  console.error('[stationary-rhythm-beat-probe-archived] FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, contract: 'stationary-rhythm-beat-probe-archived', version: pkg.version }, null, 2));
