#!/usr/bin/env node
import fs from 'node:fs';

const files = {
  report: 'src/features/xensonar/audio/waveStarterVoicePoolLiveReport.ts',
  runtime: 'src/features/xensonar/audio/waveStarterLaneRuntime.ts',
  panel: 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx',
  browserProbe: 'tools/check-stable-lane-browser-responsibility-readout.mjs',
  pkg: 'package.json',
};
const missing = [];
function read(file) { return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; }
function must(file, needle, label) {
  const text = read(file);
  if (!text.includes(needle)) missing.push(`${file}: missing ${label}`);
}
for (const [label, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) missing.push(`missing ${label} file ${file}`);
}

must(files.report, 'WaveStarterVoicePoolLiveReport', 'live report type');
must(files.report, 'latest-intent-slot-active', 'latest-intent slot decision');
must(files.report, 'micro-release-observed', 'micro-release decision');
must(files.report, 'stale-drop-protected', 'stale drop decision');
must(files.report, 'publishWaveStarterVoicePoolLiveReport', 'browser publisher');
must(files.report, 'formatWaveStarterVoicePoolLiveReportUiValue', 'UI formatter');
must(files.report, '__XENSONAR_WAVE_STARTER_VOICE_POOL_LIVE_REPORT__', 'browser global name');

must(files.runtime, 'getLiveReport: () => WaveStarterVoicePoolLiveReport', 'runtime getLiveReport contract');
must(files.runtime, 'latestIntentReplacedTotal', 'latest intent replacement counter');
must(files.runtime, 'counters.microReleasedTotal += 1', 'micro-release counter');
must(files.runtime, 'counters.staleDroppedTotal += 1', 'stale-drop counter');
must(files.runtime, 'publishLiveReport()', 'runtime publishes live report');
must(files.runtime, 'wave-starter-lane-micro-released', 'micro release adaptive action preserved');
must(files.runtime, 'wave-starter-lane-stale-dropped', 'stale drop adaptive action preserved');

must(files.panel, 'Wellenstarter Pool', 'Wellenstarter Pool UI line');
must(files.panel, '__XENSONAR_WAVE_STARTER_VOICE_POOL_LIVE_REPORT__', 'panel browser global type');
must(files.panel, 'data-wave-starter-voice-pool-live', 'Wellenstarter live DOM marker');
must(files.panel, 'formatWaveStarterVoicePoolLiveReportUiValue', 'formatter used in UI');

must(files.browserProbe, "valueAfterLabel('Wellenstarter Pool')", 'browser probe reads Wellenstarter Pool line');
must(files.browserProbe, '__XENSONAR_WAVE_STARTER_VOICE_POOL_LIVE_REPORT__', 'browser probe reads wave starter live global');

const pkg = JSON.parse(read(files.pkg) || '{}');
if (!pkg.scripts?.['xensonar:check-wave-starter-voice-pool-live-report']) {
  missing.push('package script xensonar:check-wave-starter-voice-pool-live-report missing');
}

if (missing.length) {
  console.error('[wave-starter-voice-pool-live-report] FAIL');
  for (const failure of missing) console.error(' - ' + failure);
  process.exit(1);
}
console.log('[wave-starter-voice-pool-live-report] OK · Wellenstarter latest-intent/microrelease/stale-drop live report is wired into runtime, UI, and browser probe.');
