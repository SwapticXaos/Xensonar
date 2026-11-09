import fs from 'node:fs';

const domainPath = 'src/features/xensonar/rootFollow/rootFollowAudioContextUserGestureProbe.ts';
const panelPath = 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx';
const packagePath = 'package.json';
const domain = fs.readFileSync(domainPath, 'utf8');
const panel = fs.readFileSync(panelPath, 'utf8');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

const domainMarkers = [
  'StableLaneAudioContextUserGestureProbeSnapshot',
  'detectStableLaneAudioContextUserGestureProbe',
  'classifyStableLaneAudioContextUserGestureBlocker',
  'readStableLaneAudioContextStateFromGlobals',
  'readStableLaneUserActivationDetails',
  'audio-context-suspended-user-gesture-missing',
  'stable-lane-plan-not-published',
  'worklet-frame-advance-missing',
  'stable-lane-stress-recorder-missing',
  'not-stable-lane-test-mode',
];
const panelMarkers = [
  'detectStableLaneAudioContextUserGestureProbe',
  'audioContextUserGestureProbe',
  '__XENSONAR_STABLE_LANE_AUDIO_CONTEXT_USER_GESTURE_PROBE__',
  'data-root-follow-audio-context-user-gesture-probe',
  'label="Audio-Probe"',
  'label="AudioContext"',
  'audioProbeBlocker',
  'audioProbe: audioContextUserGestureProbe',
];
const missingDomain = domainMarkers.filter((marker) => !domain.includes(marker));
const missingPanel = panelMarkers.filter((marker) => !panel.includes(marker));
if (missingDomain.length || missingPanel.length) {
  if (missingDomain.length) {
    console.error('[stable-lane-audio-context-probe] missing domain markers:');
    for (const marker of missingDomain) console.error(`  - ${marker}`);
  }
  if (missingPanel.length) {
    console.error('[stable-lane-audio-context-probe] missing panel markers:');
    for (const marker of missingPanel) console.error(`  - ${marker}`);
  }
  process.exit(1);
}
const scriptName = 'xensonar:check-stable-lane-audio-context-user-gesture-probe';
if (pkg.scripts?.[scriptName] !== 'node tools/check-stable-lane-audio-context-user-gesture-probe.mjs') {
  console.error(`[stable-lane-audio-context-probe] missing package script ${scriptName}`);
  process.exit(1);
}
if (domain.indexOf('audioContextState === "suspended" && input.userActivationHasBeenActive === false') > domain.indexOf('audioContextState === "suspended"')) {
  console.error('[stable-lane-audio-context-probe] suspended+missing-gesture classification must run before generic suspended');
  process.exit(1);
}
console.log('[stable-lane-audio-context-probe] contract OK');
