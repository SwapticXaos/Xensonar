import fs from 'node:fs';

const panelPath = 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx';
const packagePath = 'package.json';
const panel = fs.readFileSync(panelPath, 'utf8');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

const requiredPanelMarkers = [
  'STABLE_LANE_BOOT_PROBE_STORAGE_KEY',
  'xensonar:stable-lane-boot-probe:last',
  'STABLE_LANE_BOOT_PROBE_SAMPLE_WINDOW_MS',
  'StableLaneBootProbeSnapshot',
  'StableLaneBootProbeSample',
  'buildStableLaneBootProbeSnapshot',
  'inferStableLaneProofState',
  '__XENSONAR_STABLE_LANE_BOOT_PROBE__',
  'bootProbeSamplesRef',
  'window.localStorage.setItem(STABLE_LANE_BOOT_PROBE_STORAGE_KEY',
  'label="Boot-Probe"',
  'audioProbeBlocker',
  'audioProbe: StableLaneAudioContextUserGestureProbeSnapshot',
  '__XENSONAR_STABLE_LANE_AUDIO_CONTEXT_USER_GESTURE_PROBE__',
];

const missing = requiredPanelMarkers.filter((marker) => !panel.includes(marker));
if (missing.length) {
  console.error('[stable-lane-boot-probe] missing panel markers:');
  for (const marker of missing) console.error(`  - ${marker}`);
  process.exit(1);
}

const scriptName = 'xensonar:check-stable-lane-boot-probe-recorder';
if (pkg.scripts?.[scriptName] !== 'node tools/check-stable-lane-boot-probe-recorder.mjs') {
  console.error(`[stable-lane-boot-probe] missing package script ${scriptName}`);
  process.exit(1);
}

if (!panel.includes('sampleCount: args.samples.length') || !panel.includes('samples: args.samples.slice(-16)')) {
  console.error('[stable-lane-boot-probe] boot probe must retain a bounded sample window');
  process.exit(1);
}

if (!panel.includes('stableLaneProofState: args.audioProbe.stableLaneProofState') || !panel.includes('audioProbeBlocker: args.audioProbe.blockerReason')) {
  console.error('[stable-lane-boot-probe] boot probe must include stable-lane and audio-context blocker state');
  process.exit(1);
}

console.log('[stable-lane-boot-probe] contract OK');
