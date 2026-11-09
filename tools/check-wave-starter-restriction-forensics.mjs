import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const panel = read('src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx');
const audioContracts = read('src/features/xensonar/audio/audioLaneContracts.ts');
const waveGuard = read('src/features/xensonar/audio/waveStarterLaneGuard.ts');
const waveRuntime = read('src/features/xensonar/audio/waveStarterLaneRuntime.ts');
const waveArp = read('src/features/xensonar/audioTraffic/waveOvertoneArpRuntime.ts');
const rootGranular = read('src/features/xensonar/rootFollow/rootFollowGranularSettings.ts');
const rootWindow = read('src/features/xensonar/rootFollow/rootFollowSynthWindowCoordinator.ts');

const required = [
  [panel, 'data-wave-starter-restriction-forensics="root-follow-comparison"', 'Krisenmanager must expose the Wellenstarter-vs-Root-Follow forensics note.'],
  [panel, 'erst geglättet werden', 'UI must state smooth-first for Wellenstarter pressure.'],
  [panel, 'wenige Millisekunden nachliefern', 'UI must mention bounded millisecond deferral.'],
  [panel, 'Root-Follow', 'UI must compare Wellenstarter to Root-Follow, not only to Partikel.'],
  [audioContracts, "[AUDIO_LANE_IDS.WAVE_STARTER]", 'Audio lane contract must have a separate Wellenstarter lane.'],
  [audioContracts, "protectionClass: 'expressive-deferred'", 'Wellenstarter must remain an expressive deferred lane, not density-sacrificial.'],
  [audioContracts, "[AUDIO_LANE_IDS.PARTICLES]", 'Audio lane contract must still distinguish Partikel from Wellenstarter.'],
  [audioContracts, "protectionClass: 'density-sacrificial'", 'Partikel remain the density-sacrificial lane.'],
  [waveRuntime, 'deferredQueue.length = 0;', 'Wellenstarter runtime must use latest-intent deferral instead of backlog catch-up.'],
  [waveRuntime, 'wave-starter-lane-micro-released', 'Wellenstarter runtime must have a micro-release path.'],
  [waveGuard, 'recentStarts60ms >= 4', 'Current Wellenstarter guard must expose the low dense-wave-lane sensitivity being documented.'],
  [waveGuard, 'recentStarts120ms >= 5', 'Current Wellenstarter guard must expose the low 120ms density threshold being documented.'],
  [waveArp, 'window.setInterval', 'Wellenstarter overtone arp must be timer/queue based, not a continuous Root-Follow render window.'],
  [rootGranular, 'maxGrainsPerWindow: 64', 'Root-Follow rich granular preset must support much denser per-window rendering.'],
  [rootWindow, 'direct-event-window', 'Root-Follow must expose a direct event window diagnostic for multi-event windows.'],
];

const missing = required.filter(([haystack, needle]) => !haystack.includes(needle));
if (missing.length) {
  console.error('[wave-starter-restriction-forensics] FAIL');
  for (const [, needle, message] of missing) console.error(`- ${message} missing ${JSON.stringify(needle)}`);
  process.exit(1);
}

if (audioContracts.includes("[AUDIO_LANE_IDS.WAVE_STARTER]: {\n    rank: 5")) {
  console.error('[wave-starter-restriction-forensics] FAIL: Wellenstarter was pushed into Partikel sacrifice rank.');
  process.exit(1);
}

console.log('[wave-starter-restriction-forensics] OK');
