import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = (message) => {
  console.error(`[safe-audio-scheduling-anchor-contract] ${message}`);
  process.exit(1);
};

const utilityPath = 'src/core/audio/safeAudioScheduling.ts';
if (!fs.existsSync(utilityPath)) fail(`${utilityPath} is missing`);
const utility = read(utilityPath);
[
  'SAFE_AUDIO_SCHEDULE_PADDING_SEC',
  'isAudioEventValid',
  'resolveSafeAudioStartTime',
  'safeApplyAttack',
  'safeApplyExponentialRelease',
].forEach((needle) => {
  if (!utility.includes(needle)) fail(`safe utility missing ${needle}`);
});
if (!utility.includes('cancelScheduledValues')) fail('safeApplyAttack should cancel future unsafe automation from the safe anchor');
if (!utility.includes('linearRampToValueAtTime')) fail('safeApplyAttack should ramp into the peak instead of hard-setting gain');

const app = read('src/App.tsx');
[
  'safeApplyAttack',
  'safeApplyExponentialRelease',
  'isAudioEventValid',
  'safe-envelope-stale-dropped',
  'safe-envelope-catchup-ramped',
  'osc.start(safeStart)',
].forEach((needle) => {
  if (!app.includes(needle)) fail(`App playScheduledTone integration missing ${needle}`);
});
if (/gain\.gain\.setValueAtTime\(0\.0001, now\);\s*gain\.gain\.exponentialRampToValueAtTime\(Math\.max\(0\.0002, volume \* gainScale\), peakAt\)/s.test(app)) {
  fail('legacy unsafe playScheduledTone gain envelope is still present');
}

const rootFollowSynth = read('src/features/xensonar/rootFollow/rootFollowSynthRenderer.ts');
[
  'safeApplyAttack',
  'safeApplyExponentialRelease',
  'isAudioEventValid',
  'safeVoiceStart',
  'safe-envelope-stale-dropped',
  'osc.start(oscStart)',
].forEach((needle) => {
  if (!rootFollowSynth.includes(needle)) fail(`Root-Follow synth integration missing ${needle}`);
});
if (/voiceGain\.gain\.setValueAtTime\(0\.0001, effectiveNoteStart\);\s*voiceGain\.gain\.linearRampToValueAtTime\(peak, effectiveNoteStart \+ attack\)/s.test(rootFollowSynth)) {
  fail('legacy unsafe Root-Follow synth voice envelope is still present');
}

const pressure = read('src/core/audio/audioPressureMap.ts');
[
  "'safe-envelope-stale-dropped'",
  "'safe-envelope-catchup-ramped'",
].forEach((needle) => {
  if (!pressure.includes(needle)) fail(`Audio pressure witness missing ${needle}`);
});

console.log('[safe-audio-scheduling-anchor-contract] PASS');
