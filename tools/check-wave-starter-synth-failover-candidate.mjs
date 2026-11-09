#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function assertIncludes(file, content, needle, reason) {
  if (!content.includes(needle)) {
    console.error(`[xensonar-check-wave-starter-synth-failover-candidate] Missing ${needle} in ${file}: ${reason}`);
    process.exit(1);
  }
}

function assertRegex(file, content, regex, reason) {
  if (!regex.test(content)) {
    console.error(`[xensonar-check-wave-starter-synth-failover-candidate] Pattern ${regex} failed in ${file}: ${reason}`);
    process.exit(1);
  }
}

const files = {
  candidate: 'src/features/xensonar/audio/waveStarterSynthFailoverCandidate.ts',
  contract: 'src/features/xensonar/audio/waveStarterVoiceSpecFailoverContract.ts',
  laneRuntime: 'src/features/xensonar/audio/waveStarterLaneRuntime.ts',
  emitBoundary: 'src/features/xensonar/audio/waveStarterEmitAttackBoundary.ts',
  workletBridge: 'src/features/xensonar/audio/waveStarterWorkletPilotBridge.ts',
  panel: 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx',
  browserProbe: 'tools/check-stable-lane-browser-responsibility-readout.mjs',
  packageJson: 'package.json',
};

const c = Object.fromEntries(Object.entries(files).map(([key, rel]) => [key, read(rel)]));

assertIncludes(files.candidate, c.candidate, 'reportKind: "xensonar-wave-starter-synth-failover-candidate"', 'dedicated browser/report contract must exist');
assertIncludes(files.candidate, c.candidate, 'candidateKind: "wave-starter-synth-failover-candidate"', 'candidate must be explicitly synth-only');
assertIncludes(files.candidate, c.candidate, 'candidateGainScale: 1', 'candidate must target full voice-spec gain, not reduced pilot gain');
assertIncludes(files.candidate, c.candidate, 'sampleBacked: false', 'synth candidate must not pretend to carry sample buffers');
assertIncludes(files.candidate, c.candidate, 'requiresSampleBuffer: false', 'synth candidate must stay separate from later sample token shadow');
assertIncludes(files.candidate, c.candidate, 'failoverOnlyForDroppedLegacySlots: true', 'candidate report must be limited to dropped legacy slots');
assertIncludes(files.candidate, c.candidate, 'preservesLegacyForAdmittedSlots: true', 'admitted legacy Wellenstarter must remain legacy-dominant');
assertIncludes(files.candidate, c.candidate, 'sampleFailoverBlockedUntilBufferToken: true', 'sample failover must stay blocked until Buffer/Token Shadow');
assertIncludes(files.candidate, c.candidate, 'forbidsGenericSampleSubstitution: true', 'sample sounds must not be replaced by generic synth approximation');
assertIncludes(files.candidate, c.candidate, 'primaryReplacementForbidden: true', 'this patch must not turn the Worklet into a primary Wellenstarter replacement');

assertIncludes(files.contract, c.contract, 'synthWorkletFailoverCandidate?: boolean;', 'VoiceSpec contract must expose failover intent');
assertRegex(files.contract, c.contract, /if \(options\?\.synthWorkletFailoverCandidate \|\| options\?\.sampleWorkletFailoverCandidate\) return "failover";/, 'failover source intent must be explicit for synth and sample candidates');
assertIncludes(files.contract, c.contract, 'overtoneAmounts: { ...(args.overtoneAmounts ?? {}) }', 'synth VoiceSpec must preserve overtone parameters for Worklet rendering');
assertIncludes(files.contract, c.contract, 'swellBlend: clamp(args.swellBlend ?? 0, 0, 1)', 'synth VoiceSpec must preserve swell information for Worklet rendering');

assertIncludes(files.laneRuntime, c.laneRuntime, 'synthWorkletFailoverCandidate?: boolean;', 'lane runtime options must carry failover-only intent');
assertRegex(files.laneRuntime, c.laneRuntime, /decision\.kind === ['"]drop-stale['"][\s\S]*synthWorkletFailoverCandidate: true/, 'failover candidate must originate only from stale/drop slots');
assertIncludes(files.laneRuntime, c.laneRuntime, 'microReason: `synth-failover-candidate:${decision.reason}`', 'dropped-slot provenance must be visible');

assertIncludes(files.emitBoundary, c.emitBoundary, 'args.options?.synthWorkletFailoverCandidate', 'emit boundary must branch failover-only path');
assertRegex(files.emitBoundary, c.emitBoundary, /voiceSpec\.kind === "sample"[\s\S]*publishWaveStarterSampleFailoverBlocked/, 'sample Wellenstarter must be blocked rather than approximated');
assertIncludes(files.emitBoundary, c.emitBoundary, 'postWaveStarterWorkletSynthFailoverCandidate', 'synth failover candidates must be posted to Worklet bridge');
assertIncludes(files.emitBoundary, c.emitBoundary, 'return;', 'failover-only branch must not fall through into duplicate legacy emission');

assertIncludes(files.workletBridge, c.workletBridge, 'wave-starter-synth-failover-candidate', 'Worklet bridge must define candidate message');
assertIncludes(files.workletBridge, c.workletBridge, 'createSynthFailoverVoice', 'Worklet must render candidate voices rather than only acknowledge');
assertIncludes(files.workletBridge, c.workletBridge, 'synthFailoverRenderFrameCount', 'render-frame proof counter must exist');
assertIncludes(files.workletBridge, c.workletBridge, 'synth-failover-candidate-rendered', 'decision must expose rendered state');
assertIncludes(files.workletBridge, c.workletBridge, 'sampleFailoverBlockedUntilBufferToken: true', 'Worklet report must preserve sample block invariant');
assertIncludes(files.workletBridge, c.workletBridge, 'synthFailoverLegacyDropOnly: true', 'Worklet report must preserve drop-only invariant');

assertIncludes(files.panel, c.panel, 'Wellenstarter Synth-Failover', 'Performance & Krisenmanagement must show a visible synth failover line');
assertIncludes(files.panel, c.panel, '__XENSONAR_WAVE_STARTER_SYNTH_FAILOVER_CANDIDATE__', 'panel must publish browser-global report');
assertIncludes(files.panel, c.panel, 'formatWaveStarterSynthFailoverCandidateUiValue', 'panel must format the new report explicitly');

assertIncludes(files.browserProbe, c.browserProbe, 'liveWaveStarterSynthFailoverCandidate', 'browser responsibility probe must read the new global');
assertIncludes(files.browserProbe, c.browserProbe, 'Wellenstarter Synth-Failover', 'browser responsibility probe must assert the new UI line');
assertIncludes(files.browserProbe, c.browserProbe, 'sampleFailoverBlockedUntilBufferToken === true', 'browser probe must guard the sample-token invariant');
assertIncludes(files.browserProbe, c.browserProbe, 'forbidsGenericSampleSubstitution === true', 'browser probe must guard against generic sample replacement');

assertRegex(files.packageJson, c.packageJson, /\"version\": \"3\.2\.91\.6\.9\.(159|160|161|162|163|164|165|166|167|168|169|170|171|172|173|174|175|176|177|178)\"/, 'package version must stay at or beyond the 9.159 synth-failover line');
assertIncludes(files.packageJson, c.packageJson, '"xensonar:check-wave-starter-synth-failover-candidate"', 'package script must expose this guard');

console.log('[xensonar-check-wave-starter-synth-failover-candidate] OK: synth-only Wellenstarter Worklet failover candidate is wired, sample failover remains buffer/token-blocked.');
