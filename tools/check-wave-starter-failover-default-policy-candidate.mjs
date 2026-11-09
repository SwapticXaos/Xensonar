#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const fail = (message) => { console.error(`[xensonar-check-wave-starter-failover-default-policy-candidate] ${message}`); process.exit(1); };
const assertIncludes = (file, content, needle, reason) => { if (!content.includes(needle)) fail(`Missing ${needle} in ${file}: ${reason}`); };
const assertRegex = (file, content, regex, reason) => { if (!regex.test(content)) fail(`Pattern ${regex} failed in ${file}: ${reason}`); };

const files = {
  policy: 'src/features/xensonar/audio/waveStarterFailoverDefaultPolicyCandidate.ts',
  stress: 'src/features/xensonar/audio/waveStarterFailoverStressProbe.ts',
  gate: 'src/features/xensonar/audio/waveStarterFailoverDecisionGate.ts',
  parity: 'src/features/xensonar/audio/waveStarterSampleFailoverLegacyParityProbe.ts',
  panel: 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx',
  packageJson: 'package.json',
};
const c = Object.fromEntries(Object.entries(files).map(([key, rel]) => [key, read(rel)]));

assertIncludes(files.policy, c.policy, 'xensonar-wave-starter-failover-default-policy-candidate', 'policy candidate must publish its own report kind');
assertIncludes(files.policy, c.policy, '__XENSONAR_WAVE_STARTER_FAILOVER_DEFAULT_POLICY_CANDIDATE__', 'policy candidate must expose a browser-global report');
assertIncludes(files.policy, c.policy, 'doesNotMutateRuntimePolicy: true', 'candidate must not silently change the runtime default');
assertIncludes(files.policy, c.policy, 'legacyPrimaryRemainsDefault: true', 'Legacy must remain the primary reference path');
assertIncludes(files.policy, c.policy, 'workletFailoverOnly: true', 'Worklet must remain a dropped-slot failover path');
assertIncludes(files.policy, c.policy, 'doesNotEnablePrimaryReplacement: true', 'candidate must forbid Worklet primary replacement');
assertIncludes(files.policy, c.policy, 'doesNotEnableSampleToSynthFallback: true', 'candidate must forbid Sample-to-Synth fake fallback');
assertIncludes(files.policy, c.policy, 'sampleTokenRequired: true', 'Sample failover must remain token-bound');
assertIncludes(files.policy, c.policy, 'samplePilotOneShotOnly: true', 'Sample failover pilot must remain one-shot only');
assertIncludes(files.policy, c.policy, 'lateWindowStrict: true', 'strict late-window behavior must remain explicit');
assertIncludes(files.policy, c.policy, 'noLoopParityClaim: true', 'candidate must not claim loop parity');
assertIncludes(files.policy, c.policy, 'noPanFilterFxParityClaim: true', 'candidate must not claim pan/filter/fx parity');
assertIncludes(files.policy, c.policy, 'hold-worklet-not-ready', 'candidate must hold when Worklet readiness is not reliable');
assertIncludes(files.policy, c.policy, 'hold-sample-token-bottleneck', 'candidate must hold when Sample tokens are missing/unhydrated');
assertIncludes(files.policy, c.policy, 'hold-drop-heavy-gate', 'candidate must hold when explicit drops dominate');
assertIncludes(files.policy, c.policy, 'legacy-primary-synth-failover-candidate', 'candidate must support Synth-only guarded failover');
assertIncludes(files.policy, c.policy, 'legacy-primary-synth-sample-token-bound-candidate', 'candidate must support token-bound Sample failover candidate state');
assertIncludes(files.policy, c.policy, 'legacy-primary-mixed-failover-candidate', 'candidate must support mixed Synth/Sample failover state');
assertIncludes(files.policy, c.policy, 'L/Sy/Sa/D', 'formatter must expose Legacy/Synth/Sample/Drop distribution');
assertIncludes(files.policy, c.policy, 'Legacy primary', 'formatter must remind that no primary switch happened');
assertIncludes(files.policy, c.policy, 'buildWaveStarterFailoverDefaultPolicyCandidateReport', 'policy builder must be first-class');

assertIncludes(files.stress, c.stress, 'doesNotChangeDefaultPolicy: true', 'policy candidate must be based on the measurement-only stress probe');
assertIncludes(files.gate, c.gate, 'failoverOnlyForDroppedLegacySlots: true', 'candidate must preserve decision-gate semantics');
assertIncludes(files.parity, c.parity, 'knownParityGaps', 'candidate must respect known Sample parity gaps');
assertIncludes(files.panel, c.panel, 'buildWaveStarterFailoverDefaultPolicyCandidateReport', 'Krisenmanagement panel must build the candidate');
assertIncludes(files.panel, c.panel, 'Wellenstarter Default-Kandidat', 'Krisenmanagement must expose the candidate row');
assertIncludes(files.panel, c.panel, '__XENSONAR_WAVE_STARTER_FAILOVER_DEFAULT_POLICY_CANDIDATE__', 'panel global snapshot must include the candidate');
assertIncludes(files.panel, c.panel, 'waveStarterFailoverDefaultPolicyCandidateReport', 'panel must keep the candidate as first-class memo');
assertIncludes(files.packageJson, c.packageJson, '"xensonar:check-wave-starter-failover-default-policy-candidate"', 'package script must expose this guard');
assertRegex(files.packageJson, c.packageJson, /"version": "3\.2\.91\.6\.9\.(?:166|167|168|169|170|171|172|173|174|175|176|177|178)"/, 'package version must advance to 9.166');

console.log('[xensonar-check-wave-starter-failover-default-policy-candidate] OK: WaveStarter failover now has a Legacy-primary default-policy candidate layer derived from stress/gate/parity reports without changing runtime policy.');
