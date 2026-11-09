#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const fail = (message) => { console.error(`[xensonar-check-wave-starter-worklet-voice-pool-compaction] ${message}`); process.exit(1); };
const assertIncludes = (file, content, needle, reason) => { if (!content.includes(needle)) fail(`Missing ${needle} in ${file}: ${reason}`); };
const assertRegex = (file, content, regex, reason) => { if (!regex.test(content)) fail(`Pattern ${regex} failed in ${file}: ${reason}`); };

const files = {
  bridge: 'src/features/xensonar/audio/waveStarterWorkletPilotBridge.ts',
  report: 'src/features/xensonar/audio/waveStarterWorkletVoicePoolCompactionReport.ts',
  panel: 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx',
  packageJson: 'package.json',
};
const c = Object.fromEntries(Object.entries(files).map(([key, rel]) => [key, read(rel)]));

assertIncludes(files.bridge, c.bridge, 'WAVE_STARTER_WORKLET_SYNTH_FAILOVER_MAX_VOICES', 'Synth failover pool must have an explicit max');
assertIncludes(files.bridge, c.bridge, 'WAVE_STARTER_WORKLET_SAMPLE_FAILOVER_MAX_VOICES', 'Sample failover pool must have an explicit max');
assertIncludes(files.bridge, c.bridge, 'this.synthFailoverFreeVoices = []', 'Worklet must keep a reusable Synth voice pool');
assertIncludes(files.bridge, c.bridge, 'this.sampleFailoverFreeVoices = []', 'Worklet must keep a reusable Sample voice pool');
assertIncludes(files.bridge, c.bridge, 'borrowSynthFailoverVoice()', 'Synth voices must be borrowed from the pool');
assertIncludes(files.bridge, c.bridge, 'borrowSampleFailoverVoice()', 'Sample voices must be borrowed from the pool');
assertIncludes(files.bridge, c.bridge, 'recycleSynthFailoverVoice(voice)', 'Ended Synth voices must be recycled');
assertIncludes(files.bridge, c.bridge, 'recycleSampleFailoverVoice(voice)', 'Ended Sample voices must be recycled');
assertIncludes(files.bridge, c.bridge, 'enqueueSynthFailoverVoice(voice)', 'Synth enqueue must be bounded and explicit');
assertIncludes(files.bridge, c.bridge, 'enqueueSampleFailoverVoice(voice)', 'Sample enqueue must be bounded and explicit');
assertIncludes(files.bridge, c.bridge, 'synthFailoverVoicePoolDisplacedCount', 'Synth pool displacement must be reported instead of silent slice drops');
assertIncludes(files.bridge, c.bridge, 'sampleFailoverVoicePoolDisplacedCount', 'Sample pool displacement must be reported instead of silent slice drops');
assertRegex(files.bridge, c.bridge, /this\.synthFailoverVoices = survivors;[\s\S]*this\.synthFailoverLastQueuedVoiceCount = this\.synthFailoverVoices\.length/, 'Synth survivors must no longer be hidden behind a slice(-32) queue drop');
assertRegex(files.bridge, c.bridge, /this\.sampleFailoverVoices = survivors;[\s\S]*this\.sampleFailoverLastQueuedVoiceCount = this\.sampleFailoverVoices\.length/, 'Sample survivors must no longer be hidden behind a slice(-16) queue drop');

assertIncludes(files.report, c.report, 'xensonar-wave-starter-worklet-voice-pool-compaction', 'Compaction report must be first-class');
assertIncludes(files.report, c.report, '__XENSONAR_WAVE_STARTER_WORKLET_VOICE_POOL_COMPACTION__', 'Compaction report must expose a browser-global');
assertIncludes(files.report, c.report, 'preservesLegacyPrimaryPath: true', 'Compaction must not change Legacy primary routing');
assertIncludes(files.report, c.report, 'keepsFailoverOnlyContract: true', 'Compaction must remain failover-only');
assertIncludes(files.report, c.report, 'doesNotEnablePrimaryReplacement: true', 'Compaction must not enable Worklet primary mode');
assertIncludes(files.report, c.report, 'doesNotChangeSampleLoopParity: true', 'Compaction must not claim new Sample loop parity');
assertIncludes(files.panel, c.panel, 'Wellenstarter Worklet-Pool', 'Krisenmanagement must expose the compacted Worklet pool');
assertIncludes(files.panel, c.panel, 'buildWaveStarterWorkletVoicePoolCompactionReport', 'Panel must build the compaction report');
assertIncludes(files.packageJson, c.packageJson, 'xensonar:check-wave-starter-worklet-voice-pool-compaction', 'package script must expose this guard');
assertRegex(files.packageJson, c.packageJson, /"version": "3\.2\.91\.6\.9\.(167|168|169|170|171|172|173|174|175|176|177|178)"/, 'package version must be at or after the 9.167 voice-pool compaction line');

console.log('[xensonar-check-wave-starter-worklet-voice-pool-compaction] OK: Synth/Sample Worklet failover voices use bounded reusable pools with explicit displacement/reuse diagnostics; Legacy primary and Sample one-shot limits remain unchanged.');
