#!/usr/bin/env node
import fs from 'node:fs';

function must(file, needle, label) {
  if (!file.includes(needle)) {
    console.error(`[particle-voice-pool-live-report] Missing ${label}: ${needle}`);
    process.exit(1);
  }
}

const files = {
  report: fs.readFileSync('src/features/xensonar/audio/particleVoicePoolLiveReport.ts', 'utf8'),
  admission: fs.readFileSync('src/features/xensonar/audio/particleAdmissionBoundary.ts', 'utf8'),
  orchestrator: fs.readFileSync('src/features/xensonar/audio/particleNexusToneOrchestrator.ts', 'utf8'),
  quantized: fs.readFileSync('src/features/xensonar/audioTraffic/quantizedCollisionRuntime.ts', 'utf8'),
  panel: fs.readFileSync('src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx', 'utf8'),
  browserProbe: fs.readFileSync('tools/check-stable-lane-browser-responsibility-readout.mjs', 'utf8'),
  pkg: fs.readFileSync('package.json', 'utf8'),
};

must(files.report, 'ParticleVoicePoolLiveReport', 'report type');
must(files.report, 'recordParticleVoicePoolIntent', 'intent recorder');
must(files.report, 'recordParticleVoicePoolAdmission', 'admission recorder');
must(files.report, 'recordParticleVoicePoolOverflowDeferred', 'overflow/defer recorder');
must(files.report, 'recordParticleVoicePoolDispatch', 'dispatch/strong-impact recorder');
must(files.report, '__XENSONAR_PARTICLE_VOICE_POOL_LIVE_REPORT__', 'browser global name');
must(files.report, 'strong-impact-preserved', 'strong impact decision');
must(files.report, 'drop-protected', 'drop decision');
must(files.report, 'thinning-observed', 'thin decision');
must(files.report, 'deferred-overflow-observed', 'deferred decision');

must(files.admission, 'recordParticleVoicePoolAdmission', 'admission boundary publishes report');
must(files.orchestrator, 'recordParticleVoicePoolIntent', 'orchestrator records intent');
must(files.orchestrator, 'recordParticleVoicePoolDispatch', 'orchestrator records dispatch');
must(files.quantized, 'recordParticleVoicePoolOverflowDeferred', 'quantized traffic records particle overflow/defer');

must(files.panel, 'Partikel Pool', 'Partikel Pool UI line');
must(files.panel, 'readParticleVoicePoolLiveReportFromBrowser', 'panel live report polling');
must(files.panel, '__XENSONAR_PARTICLE_VOICE_POOL_LIVE_REPORT__', 'panel browser global type/export');
must(files.panel, 'data-particle-voice-pool-live', 'panel data attribute');

must(files.browserProbe, "valueAfterLabel('Partikel Pool')", 'browser probe reads Partikel Pool line');
must(files.browserProbe, '__XENSONAR_PARTICLE_VOICE_POOL_LIVE_REPORT__', 'browser probe reads particle live global');
must(files.pkg, 'xensonar:check-particle-voice-pool-live-report', 'package script');

console.log('[particle-voice-pool-live-report] OK');
