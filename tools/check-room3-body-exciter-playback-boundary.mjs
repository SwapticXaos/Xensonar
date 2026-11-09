#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const app = read('src/App.tsx');
const boundaryPath = 'src/features/xensonar/audio/room3BodyExciterPlaybackBoundary.ts';
const boundary = fs.existsSync(path.join(root, boundaryPath)) ? read(boundaryPath) : '';

const failures = [];
const mustContain = [
  [boundary, 'export function triggerRoom3BodyExciterPlayback', 'Room III body exciter playback boundary export missing'],
  [boundary, 'Room3BodyExciterPlaybackRuntime', 'boundary must expose an explicit runtime contract'],
  [boundary, 'profile.voices.slice(0, Math.max(1, options?.voiceBudget ?? profile.voices.length))', 'boundary must own voice budget slicing'],
  [boundary, 'foldFreqIntoRange(base * 0.78 + baseFreq * 0.22, 70, 6200)', 'boundary must own modal body bandpass frequency fold'],
  [boundary, 'runtime.recordAudioPressureCount("room3-body-exciter", "oscillator-start", 1)', 'boundary must own oscillator pressure witness'],
  [boundary, 'runtime.recordAudioPressureCount("room3-body-exciter", "buffer-source-start", 1)', 'boundary must own noise pressure witness'],
  [app, 'triggerRoom3BodyExciterPlayback({', 'App.tsx must delegate Room III body exciter playback into boundary'],
  [app, 'destination: refs.room3BodyExciterGain', 'App.tsx must pass destination explicitly'],
  [app, 'modal: room3ModalStateRef.current', 'App.tsx must pass modal state explicitly'],
  [app, 'controls: room3BodyControlsRef.current', 'App.tsx must pass body controls explicitly'],
];
for (const [content, needle, message] of mustContain) {
  if (!content.includes(needle)) failures.push(message);
}

const forbiddenInApp = [
  'const connectVoiceChain = (source: AudioNode, base: number, level: number, startAt: number)',
  'bandpass.frequency.setValueAtTime(foldFreqIntoRange(base * 0.78 + baseFreq * 0.22, 70, 6200), startAt)',
  'profile.voices.slice(0, Math.max(1, options?.voiceBudget ?? profile.voices.length))',
  'recordAudioPressureCount("room3-body-exciter", "oscillator-start", 1)',
  'recordAudioPressureCount("room3-body-exciter", "buffer-source-start", 1)',
];
for (const needle of forbiddenInApp) {
  if (app.includes(needle)) failures.push(`App.tsx still owns Room III body exciter detail: ${needle}`);
}

const forbiddenInBoundary = [
  'useRef(',
  'useState(',
  'useEffect(',
  'nexusRefs',
  'room3BodyEnabledRef',
  'room3ModalStateRef',
  'room3BodyControlsRef',
  'myzelTopologyModeRef',
  'getLiveMasterBus(',
];
for (const needle of forbiddenInBoundary) {
  if (boundary.includes(needle)) failures.push(`body exciter boundary depends on App-local runtime detail: ${needle}`);
}

if (failures.length) {
  console.error('[room3-body-exciter-playback-boundary] FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[room3-body-exciter-playback-boundary] OK');
