#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const fail = (message) => { console.error(`[xensonar-check-wave-starter-failover-stress-probe] ${message}`); process.exit(1); };
const assertIncludes = (file, content, needle, reason) => { if (!content.includes(needle)) fail(`Missing ${needle} in ${file}: ${reason}`); };
const assertRegex = (file, content, regex, reason) => { if (!regex.test(content)) fail(`Pattern ${regex} failed in ${file}: ${reason}`); };

const files = {
  probe: 'src/features/xensonar/audio/waveStarterFailoverStressProbe.ts',
  gate: 'src/features/xensonar/audio/waveStarterFailoverDecisionGate.ts',
  worklet: 'src/features/xensonar/audio/waveStarterWorkletPilotBridge.ts',
  panel: 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx',
  packageJson: 'package.json',
};
const c = Object.fromEntries(Object.entries(files).map(([key, rel]) => [key, read(rel)]));

assertIncludes(files.probe, c.probe, 'xensonar-wave-starter-failover-stress-probe', 'stress probe must publish its own report kind');
assertIncludes(files.probe, c.probe, '__XENSONAR_WAVE_STARTER_FAILOVER_STRESS_PROBE__', 'stress probe must expose a browser-global report');
assertIncludes(files.probe, c.probe, 'measuresDistributionOnly: true', 'probe must not pretend to be a policy switch');
assertIncludes(files.probe, c.probe, 'doesNotChangeDefaultPolicy: true', 'probe must preserve current defaults');
assertIncludes(files.probe, c.probe, 'legacyPrimaryStillDefault: true', 'probe must keep Legacy as primary reference');
assertIncludes(files.probe, c.probe, 'sampleTokenRequired: true', 'Sample failover pressure must remain token-bound');
assertIncludes(files.probe, c.probe, 'genericSampleSubstitutionForbidden: true', 'probe must keep sample-to-synth fake fallback forbidden');
assertIncludes(files.probe, c.probe, 'mixed-synth-sample-failover-observed', 'probe must distinguish mixed Synth/Sample pressure');
assertIncludes(files.probe, c.probe, 'sample-token-bottleneck-observed', 'probe must report missing/hydration token bottleneck separately');
assertIncludes(files.probe, c.probe, 'worklet-not-ready-bottleneck-observed', 'probe must report Worklet readiness bottleneck separately');
assertIncludes(files.probe, c.probe, 'drop-heavy-gate-observed', 'probe must make explicit drops visible');
assertIncludes(files.probe, c.probe, 'L/Sy/Sa/D', 'formatter must expose Legacy/Synth/Sample/Drop distribution');
assertIncludes(files.probe, c.probe, 'rendered Sy/Sa', 'formatter must expose actual rendered frame split');
assertIncludes(files.probe, c.probe, 'measure-before-default-policy', 'probe must recommend measurement before policy changes');
assertIncludes(files.probe, c.probe, 'buildWaveStarterFailoverStressProbeReport', 'probe builder must be first-class');

assertIncludes(files.gate, c.gate, 'counters: {', 'decision gate must still expose decision counters');
assertIncludes(files.worklet, c.worklet, 'synthFailoverRenderFrameCount', 'probe depends on Synth rendered-frame telemetry');
assertIncludes(files.worklet, c.worklet, 'sampleFailoverRenderFrameCount', 'probe depends on Sample rendered-frame telemetry');
assertIncludes(files.panel, c.panel, 'buildWaveStarterFailoverStressProbeReport', 'Krisenmanagement panel must build the stress probe');
assertIncludes(files.panel, c.panel, 'Wellenstarter Stress-Probe', 'Krisenmanagement must expose the stress probe row');
assertIncludes(files.panel, c.panel, '__XENSONAR_WAVE_STARTER_FAILOVER_STRESS_PROBE__', 'panel global snapshot must include stress probe');
assertIncludes(files.panel, c.panel, 'waveStarterFailoverStressProbeReport', 'panel must keep the stress probe as first-class memo');
assertIncludes(files.packageJson, c.packageJson, '"xensonar:check-wave-starter-failover-stress-probe"', 'package script must expose this guard');
assertRegex(files.packageJson, c.packageJson, /"version": "3\.2\.91\.6\.9\.(?:165|166|167|168|169|170|171|172|173|174|175|176|177|178)"/, 'package version must be at least the 9.165 stress-probe line');

console.log('[xensonar-check-wave-starter-failover-stress-probe] OK: WaveStarter failover now has a measurement-only stress probe for Legacy/Synth/Sample/Drop distribution without changing default policy.');
