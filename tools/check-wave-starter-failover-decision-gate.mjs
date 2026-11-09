#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const fail = (message) => { console.error(`[xensonar-check-wave-starter-failover-decision-gate] ${message}`); process.exit(1); };
const assertIncludes = (file, content, needle, reason) => { if (!content.includes(needle)) fail(`Missing ${needle} in ${file}: ${reason}`); };
const assertRegex = (file, content, regex, reason) => { if (!regex.test(content)) fail(`Pattern ${regex} failed in ${file}: ${reason}`); };

const files = {
  gate: 'src/features/xensonar/audio/waveStarterFailoverDecisionGate.ts',
  emitBoundary: 'src/features/xensonar/audio/waveStarterEmitAttackBoundary.ts',
  laneRuntime: 'src/features/xensonar/audio/waveStarterLaneRuntime.ts',
  panel: 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx',
  packageJson: 'package.json',
};
const c = Object.fromEntries(Object.entries(files).map(([key, rel]) => [key, read(rel)]));

assertIncludes(files.gate, c.gate, 'xensonar-wave-starter-failover-decision-gate', 'gate must publish its own report kind');
assertIncludes(files.gate, c.gate, '__XENSONAR_WAVE_STARTER_FAILOVER_DECISION_GATE__', 'gate must expose a browser-global report');
assertIncludes(files.gate, c.gate, 'legacy-admitted', 'gate must distinguish normal legacy path');
assertIncludes(files.gate, c.gate, 'synth-failover', 'gate must distinguish synth failover');
assertIncludes(files.gate, c.gate, 'sample-failover', 'gate must distinguish sample failover');
assertIncludes(files.gate, c.gate, 'drop-too-late', 'gate must strictly drop rhythmically false late candidates');
assertIncludes(files.gate, c.gate, 'drop-token-missing', 'gate must block sample failover without buffer tokens');
assertIncludes(files.gate, c.gate, 'drop-token-not-hydrated', 'gate must block sample failover until hydrated');
assertIncludes(files.gate, c.gate, 'drop-worklet-not-ready', 'gate must block when Worklet pilot is not ready');
assertIncludes(files.gate, c.gate, 'forbidsGenericSampleSubstitution: true', 'gate must forbid sample-to-synth fake fallback');
assertIncludes(files.gate, c.gate, 'primaryReplacementForbidden: true', 'gate must preserve Legacy as primary');
assertIncludes(files.gate, c.gate, 'lateWindowStrict: true', 'gate must mark strict late-window policy');
assertIncludes(files.gate, c.gate, 'failoverOnlyForDroppedLegacySlots: true', 'gate must keep failover as a dropped-slot path');
assertIncludes(files.gate, c.gate, 'formatWaveStarterFailoverDecisionGateUiValue', 'gate must have a compact UI formatter');
assertIncludes(files.gate, c.gate, 'L/Sa/Sy', 'formatter must expose legacy/sample/synth decision counters');

assertIncludes(files.emitBoundary, c.emitBoundary, 'publishWaveStarterFailoverDecisionGate', 'emit boundary must publish the central decision gate');
assertRegex(files.emitBoundary, c.emitBoundary, /failoverDecision\.decision !== "sample-failover"[\s\S]*publishWaveStarterSampleFailoverCandidateBlockedUntilHydrated/s, 'sample branch must be gated before posting candidates');
assertRegex(files.emitBoundary, c.emitBoundary, /failoverDecision\.decision !== "synth-failover"[\s\S]*postWaveStarterWorkletSynthFailoverCandidate/s, 'synth branch must be gated before posting candidates');
assertIncludes(files.laneRuntime, c.laneRuntime, 'synthWorkletFailoverCandidate: true', 'deferred stale slot must still request synth failover candidate');
assertIncludes(files.laneRuntime, c.laneRuntime, 'sampleWorkletFailoverCandidate: true', 'deferred stale slot must still request sample failover candidate');

assertIncludes(files.panel, c.panel, 'readWaveStarterFailoverDecisionGateFromBrowser', 'Krisenmanagement panel must read the decision gate');
assertIncludes(files.panel, c.panel, 'Wellenstarter Failover-Gate', 'Krisenmanagement must expose the gate row');
assertIncludes(files.panel, c.panel, '__XENSONAR_WAVE_STARTER_FAILOVER_DECISION_GATE__', 'panel global snapshot must include the gate');
assertIncludes(files.panel, c.panel, 'waveStarterFailoverDecisionGateReport', 'panel must keep the gate as first-class state');
assertIncludes(files.packageJson, c.packageJson, '"xensonar:check-wave-starter-failover-decision-gate"', 'package script must expose this guard');
assertRegex(files.packageJson, c.packageJson, /"version": "3\.2\.91\.6\.9\.(?:164|165|166|167|168|169|170|171|172|173|174|175|176|177|178)"/, 'package version must be at least the 9.164 decision-gate line');

console.log('[xensonar-check-wave-starter-failover-decision-gate] OK: WaveStarter failover decisions are centralized into a Legacy/Synth/Sample/Drop gate with explicit late, token, hydration, and Worklet-readiness blockers.');
