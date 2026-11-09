#!/usr/bin/env node
import fs from 'node:fs';

const files = {
  bridge: 'src/features/xensonar/audio/waveStarterWorkletPilotBridge.ts',
  report: 'src/features/xensonar/audio/waveStarterWorkletPilotReport.ts',
  processorSource: 'src/features/xensonar/audio/waveStarterWorkletPilotProcessorSource.ts',
  runtime: 'src/features/xensonar/audio/waveStarterLaneRuntime.ts',
  app: 'src/App.tsx',
  rootFollowTab: 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisRootFollowTab.tsx',
  browserReports: 'src/features/xensonar/performanceCrisis/performanceCrisisBrowserReports.ts',
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

// Current-line structure: the bridge owns node/session/message posting, while
// the report module owns snapshot shape, browser-global publishing, and UI formatting.
must(files.bridge, 'postWaveStarterWorkletShadowIntent', 'intent poster');
must(files.bridge, 'createWaveStarterWorkletPilotSnapshot as baseSnapshot', 'bridge imports report snapshot factory');
must(files.bridge, 'publishWaveStarterWorkletPilotSnapshot as publishSnapshot', 'bridge imports report publisher');
must(files.bridge, 'readWaveStarterWorkletPilotReportFromBrowser', 'bridge re-exports browser report reader');
must(files.bridge, 'addAudioWorkletBlobModule', 'central blob worklet loader used');

must(files.report, 'WAVE_STARTER_WORKLET_PILOT_GLOBAL', 'browser global name lives in report module');
must(files.report, 'parallelPilotPreservesLegacyReference: true', 'parallel pilot preserves legacy invariant');
must(files.report, 'parallelPilotRequiresShapeProof: true', 'parallel pilot shape-proof gate invariant');
must(files.report, 'preservesMainThreadReferencePath: true', 'legacy audible path invariant');
must(files.report, 'processor-error-fallback', 'processor error fallback decision');
must(files.report, 'frame-advance-observed', 'frame advance decision');
must(files.report, 'formatWaveStarterWorkletPilotUiValue', 'UI formatter lives in report module');
must(files.report, 'createWaveStarterWorkletPilotSnapshot', 'snapshot factory lives in report module');

must(files.processorSource, 'xensonar-wave-starter-shadow-pilot', 'processor name');
must(files.processorSource, 'WAVE_STARTER_WORKLET_PARALLEL_PILOT_GAIN', 'bounded parallel pilot gain constant');

must(files.runtime, "import { postWaveStarterWorkletShadowIntent }", 'runtime imports pilot poster');
must(files.runtime, 'getAudioContext?: () => BaseAudioContext | null | undefined', 'audio context supplier contract');
must(files.runtime, 'mirrorIntentToWorkletPilot', 'runtime mirrors intents to pilot');
must(files.runtime, 'source: "request" | "deferred-flush"', 'request/deferred source tagging');
must(files.runtime, 'mirrorIntentToWorkletPilot(baseFreq, isSector, requestedAtMs, "request")', 'direct request mirrored');
must(files.runtime, 'mirrorIntentToWorkletPilot(', 'deferred flush mirroring call exists');
must(files.runtime, '"deferred-flush"', 'deferred flush source tag exists');

must(files.app, 'getAudioContext: () => audioCtxRef.current ?? audioCtx', 'App supplies audio context to modern lane runtime bridge');

must(files.rootFollowTab, 'Wellenstarter Worklet', 'UI line');
must(files.rootFollowTab, 'data-wave-starter-worklet-pilot', 'DOM marker');
must(files.rootFollowTab, 'formatWaveStarterWorkletPilotUiValue', 'UI formatter used');
must(files.browserReports, 'readWaveStarterWorkletPilotReportFromBrowser', 'browser reports read worklet pilot report');
must(files.browserReports, 'waveStarterWorkletPilotReport', 'browser reports expose worklet pilot report');

must(files.browserProbe, "valueAfterLabel('Wellenstarter Worklet')", 'browser probe reads UI line');
must(files.browserProbe, '__XENSONAR_WAVE_STARTER_WORKLET_PILOT_REPORT__', 'browser probe reads global');

const pkg = JSON.parse(read(files.pkg) || '{}');
if (!pkg.scripts?.['xensonar:check-wave-starter-worklet-pilot']) {
  missing.push('package script xensonar:check-wave-starter-worklet-pilot missing');
}

if (missing.length) {
  console.error('[wave-starter-worklet-pilot] FAIL');
  for (const failure of missing) console.error(' - ' + failure);
  process.exit(1);
}
console.log('[wave-starter-worklet-pilot] OK · Wellenstarter worklet pilot bridge is split into node/session bridge + report surface, with App supplying the modern lane runtime audio context.');
