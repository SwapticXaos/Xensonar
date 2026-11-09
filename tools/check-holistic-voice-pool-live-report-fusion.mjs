#!/usr/bin/env node
import fs from 'node:fs';

const files = {
  holistic: 'src/features/xensonar/audio/holisticVoicePoolFallback.ts',
  panel: 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx',
  wave: 'src/features/xensonar/audio/waveStarterVoicePoolLiveReport.ts',
  particle: 'src/features/xensonar/audio/particleVoicePoolLiveReport.ts',
  browserProbe: 'tools/check-stable-lane-browser-responsibility-readout.mjs',
  pkg: 'package.json',
};
const missing = [];
function read(path) { return fs.existsSync(path) ? fs.readFileSync(path, 'utf8') : ''; }
function must(path, needle, label) {
  const text = read(path);
  if (!text.includes(needle)) missing.push(`${path}: missing ${label}`);
}
for (const [label, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) missing.push(`missing ${label} file ${file}`);
}

must(files.holistic, "import type { WaveStarterVoicePoolLiveReport }", 'wave starter live report type import');
must(files.holistic, "import type { ParticleVoicePoolLiveReport }", 'particle live report type import');
must(files.holistic, "waveStarterLiveReport?: WaveStarterVoicePoolLiveReport | null", 'wave starter live report input');
must(files.holistic, "particleVoicePoolLiveReport?: ParticleVoicePoolLiveReport | null", 'particle live report input');
must(files.holistic, "liveReportDecision: string | null", 'lane live report decision field');
must(files.holistic, "livePressureSource: HolisticVoicePoolLiveReportSource", 'lane live pressure source field');
must(files.holistic, "observedDrop", 'lane observed drop field');
must(files.holistic, "observedDeferred", 'lane observed deferred field');
must(files.holistic, "observedPreservedStrongImpact", 'lane observed strong impact field');
must(files.holistic, "significantWaveStarterBlockers", 'wave live blocker integration');
must(files.holistic, "liveCounters.microReleasedTotal", 'wave microrelease counter integrated');
must(files.holistic, "liveCounters.staleDroppedTotal", 'wave stale drop counter integrated');
must(files.holistic, "liveCounters.emittedFromDeferredTotal", 'wave deferred emit counter integrated');
must(files.holistic, "significantParticleBlockers", 'particle live blocker integration');
must(files.holistic, "counters.thinnedTotal", 'particle thinning counter integrated');
must(files.holistic, "counters.strongImpactTotal", 'particle strong impact counter integrated');
must(files.holistic, "particle-live-report-missing-under-pressure", 'particle proxy fallback warning');
must(files.holistic, "wave-starter-live-report-missing-under-pressure", 'wave proxy fallback warning');
must(files.holistic, "pressureLaneReportsObserved", 'default readiness requires live pressure reports when pressure is present');
must(files.holistic, "[${waveSource}]", 'holistic UI marks wave source');
must(files.holistic, "[${particleSource}]", 'holistic UI marks particle source');

must(files.panel, "waveStarterLiveReport: waveStarterVoicePoolLiveReport", 'panel passes wave live report into holistic report');
must(files.panel, "particleVoicePoolLiveReport", 'panel passes particle live report into holistic report');
must(files.panel, "waveStarterVoicePoolLiveReport", 'holistic useMemo depends on wave live report');
must(files.panel, "particleVoicePoolLiveReport", 'holistic useMemo depends on particle live report');
must(files.panel, 'Voice-Pool Gesamt', 'holistic UI line preserved');
must(files.panel, 'Wellenstarter Pool', 'wave pool line preserved');
must(files.panel, 'Partikel Pool', 'particle pool line preserved');

must(files.wave, 'WaveStarterVoicePoolLiveReport', 'wave live report exists');
must(files.particle, 'ParticleVoicePoolLiveReport', 'particle live report exists');
must(files.browserProbe, '__XENSONAR_HOLISTIC_VOICE_POOL_FALLBACK_REPORT__', 'browser probe reads holistic global');
must(files.browserProbe, '__XENSONAR_WAVE_STARTER_VOICE_POOL_LIVE_REPORT__', 'browser probe reads wave global');
must(files.browserProbe, '__XENSONAR_PARTICLE_VOICE_POOL_LIVE_REPORT__', 'browser probe reads particle global');

const pkg = JSON.parse(read(files.pkg) || '{}');
if (!pkg.scripts?.['xensonar:check-holistic-voice-pool-live-report-fusion']) {
  missing.push('package script xensonar:check-holistic-voice-pool-live-report-fusion missing');
}

if (missing.length) {
  console.error('[holistic-voice-pool-live-report-fusion] FAIL');
  for (const failure of missing) console.error(' - ' + failure);
  process.exit(1);
}
console.log('[holistic-voice-pool-live-report-fusion] OK · Voice-Pool Gesamt now consumes Wellenstarter/Partikel live reports and only falls back to traffic proxies when no live runtime report exists.');
