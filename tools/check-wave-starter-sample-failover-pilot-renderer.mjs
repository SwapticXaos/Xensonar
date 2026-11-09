#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function fail(message) { console.error(`[xensonar-check-wave-starter-sample-failover-pilot-renderer] ${message}`); process.exit(1); }
function assertIncludes(file, content, needle, reason) { if (!content.includes(needle)) fail(`Missing ${needle} in ${file}: ${reason}`); }
function assertRegex(file, content, regex, reason) { if (!regex.test(content)) fail(`Pattern ${regex} failed in ${file}: ${reason}`); }
function assertNotIncludes(file, content, needle, reason) { if (content.includes(needle)) fail(`Forbidden ${needle} in ${file}: ${reason}`); }

const files = {
  bridge: 'src/features/xensonar/audio/waveStarterWorkletPilotBridge.ts',
  candidate: 'src/features/xensonar/audio/waveStarterSampleFailoverCandidate.ts',
  tokenShadow: 'src/features/xensonar/audio/waveStarterSampleBufferTokenShadow.ts',
  emitBoundary: 'src/features/xensonar/audio/waveStarterEmitAttackBoundary.ts',
  panel: 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx',
  packageJson: 'package.json',
};
const c = Object.fromEntries(Object.entries(files).map(([key, rel]) => [key, read(rel)]));

assertIncludes(files.bridge, c.bridge, 'this.sampleFailoverVoices = [];', 'Worklet must own a separate sample failover voice queue');
assertIncludes(files.bridge, c.bridge, 'createSampleFailoverVoice(candidate, shadow', 'Worklet must construct sample voices from hydrated token shadows');
assertIncludes(files.bridge, c.bridge, 'this.sampleBufferTokenShadows.get(token)', 'sample renderer must remain gated by hydrated token bodies');
assertIncludes(files.bridge, c.bridge, 'sampleFailoverRenderFrameCount', 'sample render frames must be tracked separately from synth failover frames');
assertIncludes(files.bridge, c.bridge, 'sampleFailoverRenderQuantumCount', 'sample render quanta must be tracked for crisis diagnostics');
assertIncludes(files.bridge, c.bridge, 'sampleFailoverPeakAbs', 'sample renderer must expose peak bounds for sanity checks');
assertIncludes(files.bridge, c.bridge, 'renderPilotOneShotEnabled: true', 'Worklet ack must state one-shot sample pilot rendering is enabled');
assertIncludes(files.bridge, c.bridge, 'loopDisabledInPilot: true', 'sample failover pilot must explicitly disable loop parity');
assertIncludes(files.bridge, c.bridge, 'sample-failover-candidate-rendered', 'snapshot decision must expose rendered sample failover');
assertIncludes(files.bridge, c.bridge, 'sampleFailoverPilotOneShotOnly: true', 'snapshot must mark one-shot-only semantics');
assertIncludes(files.bridge, c.bridge, 'sampleFailoverPilotLoopDisabled: true', 'snapshot must mark loop disabled in the pilot');
assertRegex(files.bridge, c.bridge, /const sourceStep = playbackRate \* sourceSampleRate \/ Math\.max\(1, sampleRate\)/, 'renderer must compensate source/context sample-rate relation');
assertRegex(files.bridge, c.bridge, /const raw = \(sourceChannel\[index0\].*sourceChannel\[index1\]/s, 'renderer must use bounded linear interpolation rather than nearest-only playback');
assertIncludes(files.bridge, c.bridge, 'enqueueSampleFailoverVoice(voice)', 'sample voice queue must stay bounded through the compacted voice-pool enqueue');

assertIncludes(files.candidate, c.candidate, 'renderPilotOneShotEnabled: true', 'candidate must advertise the enabled one-shot renderer');
assertIncludes(files.candidate, c.candidate, 'loopDisabledInPilot: true', 'candidate must not claim loop parity');
assertIncludes(files.candidate, c.candidate, 'renderPilotStillNotPrimaryPath: true', 'sample pilot must remain failover-only');
assertIncludes(files.candidate, c.candidate, 'sampleRendererPilotEnabled: true', 'candidate report must expose renderer pilot enabled state');
assertIncludes(files.candidate, c.candidate, 'sampleRenderFrameCount', 'candidate report must show sample render frames');
assertIncludes(files.candidate, c.candidate, 'sample-failover-candidate-worklet-rendered', 'candidate report must distinguish rendered from merely accepted');
assertIncludes(files.candidate, c.candidate, 'kein Synth-Fake', 'UI formatter must continue forbidding generic synth substitution');

assertIncludes(files.tokenShadow, c.tokenShadow, 'renderPilotOneShotEligible: true', 'sample token shadow must advertise one-shot renderer eligibility');
assertIncludes(files.tokenShadow, c.tokenShadow, 'sampleRendererPilotEnabled: true', 'token report must no longer claim renderer disabled');
assertIncludes(files.emitBoundary, c.emitBoundary, 'args.options?.sampleWorkletFailoverCandidate && voiceSpec.kind === "sample"', 'sample branch must remain separate from synth branch');
assertRegex(files.emitBoundary, c.emitBoundary, /sampleWorkletFailoverCandidate[\s\S]*postWaveStarterWorkletSampleFailoverCandidate[\s\S]*return;[\s\S]*synthWorkletFailoverCandidate/, 'sample candidates must not fall through into synth fallback');
assertIncludes(files.panel, c.panel, 'Wellenstarter Sample-Failover', 'Krisenmanagement must keep the dedicated sample failover row');
assertIncludes(files.packageJson, c.packageJson, '"xensonar:check-wave-starter-sample-failover-pilot-renderer"', 'package script must expose this renderer guard');
assertRegex(files.packageJson, c.packageJson, /"version": "3\.2\.91\.6\.9\.(?:162|163|164|165|166|167|168|169|170|171|172|173|174|175|176|177|178)"/, 'package version must be at least the 9.162 renderer line');

assertNotIncludes(files.candidate, c.candidate, 'renderPilotDisabledUntilNextPatch: true', '9.162 must not leave the candidate in the pre-renderer state');

console.log('[xensonar-check-wave-starter-sample-failover-pilot-renderer] OK: Sample-Wellenstarter failover has a bounded hydrated-token one-shot Worklet renderer; loop/primary/Fx parity remain explicitly out of scope.');
