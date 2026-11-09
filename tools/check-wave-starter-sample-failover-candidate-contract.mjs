#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function fail(message) { console.error(`[xensonar-check-wave-starter-sample-failover-candidate-contract] ${message}`); process.exit(1); }
function assertIncludes(file, content, needle, reason) { if (!content.includes(needle)) fail(`Missing ${needle} in ${file}: ${reason}`); }
function assertRegex(file, content, regex, reason) { if (!regex.test(content)) fail(`Pattern ${regex} failed in ${file}: ${reason}`); }

const files = {
  candidate: 'src/features/xensonar/audio/waveStarterSampleFailoverCandidate.ts',
  sampleShadow: 'src/features/xensonar/audio/waveStarterSampleBufferTokenShadow.ts',
  contract: 'src/features/xensonar/audio/waveStarterVoiceSpecFailoverContract.ts',
  laneRuntime: 'src/features/xensonar/audio/waveStarterLaneRuntime.ts',
  emitBoundary: 'src/features/xensonar/audio/waveStarterEmitAttackBoundary.ts',
  workletBridge: 'src/features/xensonar/audio/waveStarterWorkletPilotBridge.ts',
  panel: 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx',
  packageJson: 'package.json',
};
const c = Object.fromEntries(Object.entries(files).map(([key, rel]) => [key, read(rel)]));

assertIncludes(files.candidate, c.candidate, 'candidateKind: "wave-starter-sample-failover-candidate"', 'sample failover must have its own candidate kind');
assertIncludes(files.candidate, c.candidate, 'requiresHydratedBufferToken: true', 'sample failover must require a hydrated buffer token');
assertIncludes(files.candidate, c.candidate, 'sampleBacked: true', 'sample failover candidate must stay sample-backed');
assertIncludes(files.candidate, c.candidate, 'requiresSampleBuffer: true', 'sample candidate must not be metadata-only');
assertIncludes(files.candidate, c.candidate, 'synthFallbackForbidden: true', 'sample candidate must not degrade into synth fallback');
assertIncludes(files.candidate, c.candidate, 'renderPilotOneShotEnabled: true', '9.162 must expose the bounded one-shot renderer contract');
assertIncludes(files.candidate, c.candidate, 'loopDisabledInPilot: true', 'sample failover pilot must not claim loop parity');
assertIncludes(files.candidate, c.candidate, 'primaryReplacementForbidden: true', 'sample failover is not a primary Wellenstarter replacement');
assertIncludes(files.candidate, c.candidate, 'formatWaveStarterSampleFailoverCandidateUiValue', 'Krisenmanagement needs a dedicated UI formatter');

assertIncludes(files.contract, c.contract, 'sampleWorkletFailoverCandidate?: boolean;', 'VoiceSpec source intent must know sample-specific failover intent');
assertRegex(files.contract, c.contract, /synthWorkletFailoverCandidate \|\| options\?\.sampleWorkletFailoverCandidate/, 'sample and synth failover should share failover sourceIntent without sharing candidate kind');

assertIncludes(files.laneRuntime, c.laneRuntime, 'sampleWorkletFailoverCandidate?: boolean;', 'lane runtime options must carry sample-specific failover intent');
assertRegex(files.laneRuntime, c.laneRuntime, /decision\.kind === ['"]drop-stale['"][\s\S]*synthWorkletFailoverCandidate: true,[\s\S]*sampleWorkletFailoverCandidate: true/, 'drop-stale slot must carry both candidate intents so emit boundary can choose by resolved sound kind');

assertIncludes(files.emitBoundary, c.emitBoundary, 'args.options?.sampleWorkletFailoverCandidate && voiceSpec.kind === "sample"', 'emit boundary must branch sample candidates before synth fallback branch');
assertIncludes(files.emitBoundary, c.emitBoundary, 'buildWaveStarterSampleFailoverCandidate', 'emit boundary must build a real sample candidate');
assertIncludes(files.emitBoundary, c.emitBoundary, 'postWaveStarterWorkletSampleFailoverCandidate', 'emit boundary must post sample candidate to the Worklet bridge');
assertIncludes(files.emitBoundary, c.emitBoundary, 'publishWaveStarterSampleFailoverCandidateBlockedUntilHydrated', 'sample candidates must be blockable until Worklet token hydration');
assertIncludes(files.emitBoundary, c.emitBoundary, 'publishWaveStarterSampleFailoverBlockedMissingToken', 'missing-token failure must be explicit');
assertRegex(files.emitBoundary, c.emitBoundary, /sampleWorkletFailoverCandidate[\s\S]*return;[\s\S]*synthWorkletFailoverCandidate/, 'sample branch must not fall through into synth candidate path');

assertIncludes(files.workletBridge, c.workletBridge, 'wave-starter-sample-failover-candidate', 'Worklet bridge must define sample candidate message');
assertIncludes(files.workletBridge, c.workletBridge, 'this.sampleBufferTokenShadows.get(token)', 'Worklet must gate sample candidate against hydrated token bodies');
assertIncludes(files.workletBridge, c.workletBridge, 'missing-hydrated-sample-buffer-token', 'Worklet must reject non-hydrated sample candidates');
assertIncludes(files.workletBridge, c.workletBridge, 'renderPilotOneShotEnabled: true', 'Worklet ack must state the bounded one-shot renderer is enabled');
assertIncludes(files.workletBridge, c.workletBridge, 'loopDisabledInPilot: true', 'Worklet ack must state loop rendering is disabled in the pilot');
assertIncludes(files.workletBridge, c.workletBridge, 'postWaveStarterWorkletSampleFailoverCandidate', 'main bridge must expose sample candidate posting');
assertIncludes(files.workletBridge, c.workletBridge, 'sampleFailoverCandidateAcceptedCount', 'snapshot must expose sample candidate acceptance');
assertIncludes(files.workletBridge, c.workletBridge, 'sampleFailoverCandidateRejectedCount', 'snapshot must expose sample candidate rejection');

assertIncludes(files.panel, c.panel, 'Wellenstarter Sample-Failover', 'Performance & Krisenmanagement must show sample failover separate from Sample-Token');
assertIncludes(files.panel, c.panel, 'formatWaveStarterSampleFailoverCandidateUiValue', 'panel must format sample candidate report explicitly');

assertIncludes(files.sampleShadow, c.sampleShadow, 'synthFallbackForbiddenForSamples: true', 'token shadow must continue forbidding sample-to-synth fallback');
assertRegex(files.packageJson, c.packageJson, /"version": "3\.2\.91\.6\.9\.(?:162|163|164|165|166|167|168|169|170|171|172|173|174|175|176|177|178)"/, 'package version must be at least the 9.162 renderer line');
assertIncludes(files.packageJson, c.packageJson, '"xensonar:check-wave-starter-sample-failover-candidate-contract"', 'package script must expose this guard');

console.log('[xensonar-check-wave-starter-sample-failover-candidate-contract] OK: Sample-Wellenstarter now have a dedicated failover candidate contract gated by hydrated buffer tokens; audible sample rendering is now limited to the bounded one-shot pilot renderer.');
