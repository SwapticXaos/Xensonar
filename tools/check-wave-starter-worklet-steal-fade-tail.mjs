#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const fail = (message) => { console.error(`[xensonar-check-wave-starter-worklet-steal-fade-tail] ${message}`); process.exit(1); };
const assertIncludes = (file, content, needle, reason) => { if (!content.includes(needle)) fail(`Missing ${needle} in ${file}: ${reason}`); };
const assertRegex = (file, content, regex, reason) => { if (!regex.test(content)) fail(`Pattern ${regex} failed in ${file}: ${reason}`); };

const files = {
  bridge: 'src/features/xensonar/audio/waveStarterWorkletPilotBridge.ts',
  report: 'src/features/xensonar/audio/waveStarterWorkletVoicePoolCompactionReport.ts',
  panel: 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx',
  packageJson: 'package.json',
};
const c = Object.fromEntries(Object.entries(files).map(([key, rel]) => [key, read(rel)]));

assertIncludes(files.bridge, c.bridge, 'WAVE_STARTER_WORKLET_STEAL_FADE_TAIL_FRAMES', 'Steal fade must be bounded by an explicit short frame count');
assertIncludes(files.bridge, c.bridge, 'WAVE_STARTER_WORKLET_STEAL_FADE_MAX_TAILS', 'Steal fade tail queue must have an explicit cap');
assertIncludes(files.bridge, c.bridge, 'this.synthFailoverStealFadeTails = []', 'Synth displaced voices must have a separate short fade-tail queue');
assertIncludes(files.bridge, c.bridge, 'this.sampleFailoverStealFadeTails = []', 'Sample displaced voices must have a separate short fade-tail queue');
assertIncludes(files.bridge, c.bridge, 'enqueueSynthStealFadeTail(displaced)', 'Synth displacement must enqueue a short fade tail before recycling');
assertIncludes(files.bridge, c.bridge, 'enqueueSampleStealFadeTail(displaced)', 'Sample displacement must enqueue a short fade tail before recycling');
assertRegex(files.bridge, c.bridge, /this\.enqueueSynthStealFadeTail\(displaced\);\s*this\.recycleSynthFailoverVoice\(displaced\);/, 'Synth voice stealing must fade before recycling the displaced voice');
assertRegex(files.bridge, c.bridge, /this\.enqueueSampleStealFadeTail\(displaced\);\s*this\.recycleSampleFailoverVoice\(displaced\);/, 'Sample voice stealing must fade before recycling the displaced voice');
assertIncludes(files.bridge, c.bridge, 'synthFailoverStealFadeTailRenderFrameCount', 'Synth steal-fade tail render frames must be counted');
assertIncludes(files.bridge, c.bridge, 'sampleFailoverStealFadeTailRenderFrameCount', 'Sample steal-fade tail render frames must be counted');
assertIncludes(files.bridge, c.bridge, 'synthStealFadeRenderedThisQuantum', 'Throughput message must be sent while Synth steal fades are active');
assertIncludes(files.bridge, c.bridge, 'sampleStealFadeRenderedThisQuantum', 'Throughput message must be sent while Sample steal fades are active');

assertIncludes(files.report, c.report, 'pool-steal-fade-tailing', 'Pool report must distinguish active steal-fade tails from raw displacement');
assertIncludes(files.report, c.report, 'stealFadeTailEnabled: true', 'Report must expose steal-fade capability');
assertIncludes(files.report, c.report, 'stealFadeTailIsOnlyForVoiceStealing: true', 'Report must keep this scoped to voice stealing, not a new audible mode');
assertIncludes(files.report, c.report, 'very short steal-fade tail', 'Report detail must state that displaced voices are fade-tailed instead of hard-killed');
assertIncludes(files.report, c.report, 'Legacy primary routing', 'Report must preserve Legacy primary routing');
assertIncludes(files.panel, c.panel, 'Wellenstarter Worklet-Pool', 'Existing Krisenmanagement pool line must remain the UI anchor');
assertIncludes(files.packageJson, c.packageJson, 'xensonar:check-wave-starter-worklet-steal-fade-tail', 'package script must expose this guard');
assertRegex(files.packageJson, c.packageJson, /"version": "3\.2\.91\.6\.9\.(?:169|170|171|172|173|174|175|176|177|178)"/, 'package version must advance to 9.169');

console.log('[xensonar-check-wave-starter-worklet-steal-fade-tail] OK: Worklet voice stealing now adds bounded short fade tails for displaced Synth/Sample failover voices without changing Legacy primary or Sample one-shot contracts.');
