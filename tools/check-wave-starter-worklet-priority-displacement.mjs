#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const fail = (message) => { console.error(`[xensonar-check-wave-starter-worklet-priority-displacement] ${message}`); process.exit(1); };
const assertIncludes = (file, content, needle, reason) => { if (!content.includes(needle)) fail(`Missing ${needle} in ${file}: ${reason}`); };
const assertRegex = (file, content, regex, reason) => { if (!regex.test(content)) fail(`Pattern ${regex} failed in ${file}: ${reason}`); };

const files = {
  bridge: 'src/features/xensonar/audio/waveStarterWorkletPilotBridge.ts',
  report: 'src/features/xensonar/audio/waveStarterWorkletVoicePoolCompactionReport.ts',
  panel: 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx',
  packageJson: 'package.json',
};
const c = Object.fromEntries(Object.entries(files).map(([key, rel]) => [key, read(rel)]));

assertIncludes(files.bridge, c.bridge, 'estimateSynthFailoverVoiceRetentionScore(voice)', 'Synth pool displacement must use a retention score, not blind FIFO');
assertIncludes(files.bridge, c.bridge, 'estimateSampleFailoverVoiceRetentionScore(voice)', 'Sample pool displacement must use a retention score, not blind FIFO');
assertIncludes(files.bridge, c.bridge, 'selectLowestRetentionVoiceIndex(voices, estimator)', 'Shared priority selector must choose the least protected active voice');
assertRegex(files.bridge, c.bridge, /this\.synthFailoverVoices\.splice\(displacedIndex, 1\)\[0\]/, 'Synth displacement must remove the selected low-retention voice');
assertRegex(files.bridge, c.bridge, /this\.sampleFailoverVoices\.splice\(displacedIndex, 1\)\[0\]/, 'Sample displacement must remove the selected low-retention voice');
assertIncludes(files.bridge, c.bridge, 'synthFailoverVoicePoolPriorityDisplacedCount', 'Synth priority displacement must be counted');
assertIncludes(files.bridge, c.bridge, 'sampleFailoverVoicePoolPriorityDisplacedCount', 'Sample priority displacement must be counted');
assertIncludes(files.bridge, c.bridge, 'synthFailoverVoicePoolLastDisplacedScore', 'Synth last displaced retention score must be reported');
assertIncludes(files.bridge, c.bridge, 'sampleFailoverVoicePoolLastDisplacedScore', 'Sample last displaced retention score must be reported');
assertIncludes(files.bridge, c.bridge, 'synthFailoverVoicePoolPriorityDisplacementEnabled: true', 'Snapshot must advertise priority displacement as enabled');
assertIncludes(files.bridge, c.bridge, 'sampleFailoverVoicePoolPriorityDisplacementEnabled: true', 'Snapshot must advertise Sample priority displacement as enabled');

assertIncludes(files.report, c.report, 'priorityDisplacementEnabled: true', 'Pool report must expose priority displacement without adding a separate UI fiction');
assertIncludes(files.report, c.report, 'synthPriorityDisplacedCount', 'Pool report must include Synth priority displacement count');
assertIncludes(files.report, c.report, 'samplePriorityDisplacedCount', 'Pool report must include Sample priority displacement count');
assertIncludes(files.report, c.report, 'lowest retention-score voice is displaced', 'Report detail must state the actual displacement rule');
assertIncludes(files.report, c.report, 'Legacy primary routing', 'Report must preserve Legacy primary routing in text and contract');
assertIncludes(files.panel, c.panel, 'Wellenstarter Worklet-Pool', 'Existing Krisenmanagement pool line must remain the UI anchor');
assertIncludes(files.packageJson, c.packageJson, 'xensonar:check-wave-starter-worklet-priority-displacement', 'package script must expose this guard');
assertRegex(files.packageJson, c.packageJson, /"version": "3\.2\.91\.6\.9\.(168|169|170|171|172|173|174|175|176|177|178)"/, 'package version must be at or after the 9.168 priority-displacement line');

console.log('[xensonar-check-wave-starter-worklet-priority-displacement] OK: Worklet failover pools now displace the lowest-retention active Synth/Sample voice instead of blind FIFO, while Legacy primary and failover-only contracts remain intact.');
