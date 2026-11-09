#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function fail(message) { console.error(`[xensonar-check-wave-starter-sample-buffer-token-shadow] ${message}`); process.exit(1); }
function assertIncludes(file, content, needle, reason) { if (!content.includes(needle)) fail(`Missing ${needle} in ${file}: ${reason}`); }
function assertRegex(file, content, regex, reason) { if (!regex.test(content)) fail(`Pattern ${regex} failed in ${file}: ${reason}`); }

const files = {
  shadow: 'src/features/xensonar/audio/waveStarterSampleBufferTokenShadow.ts',
  contract: 'src/features/xensonar/audio/waveStarterVoiceSpecFailoverContract.ts',
  sampleBoundary: 'src/features/xensonar/audio/waveStarterSamplePlaybackBoundary.ts',
  emitBoundary: 'src/features/xensonar/audio/waveStarterEmitAttackBoundary.ts',
  workletBridge: 'src/features/xensonar/audio/waveStarterWorkletPilotBridge.ts',
  panel: 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx',
  browserProbe: 'tools/check-stable-lane-browser-responsibility-readout.mjs',
  packageJson: 'package.json',
};
const c = Object.fromEntries(Object.entries(files).map(([key, rel]) => [key, read(rel)]));

assertIncludes(files.shadow, c.shadow, 'shadowKind: "wave-starter-sample-buffer-token-shadow"', 'sample shadow must be a dedicated body/token contract');
assertIncludes(files.shadow, c.shadow, 'resolveWaveStarterSampleBufferToken', 'sample VoiceSpec must receive a deterministic token before hydration');
assertIncludes(files.shadow, c.shadow, 'loadMelodicSampleBuffer', 'shadow must derive from real melodic sample buffers, not synthetic approximation');
assertIncludes(files.shadow, c.shadow, 'Float32Array[]', 'shadow must prepare real channel data for Worklet hydration');
assertIncludes(files.shadow, c.shadow, 'transfer: channelData.map((entry) => entry.buffer)', 'shadow must use Transferable buffer handoff rather than metadata-only pretending');
assertIncludes(files.shadow, c.shadow, 'sampleRenderingDisabledUntilPilot: false', '9.162 must expose that the bounded sample one-shot pilot can render after token hydration');
assertIncludes(files.shadow, c.shadow, 'sampleRendererPilotEnabled: true', 'sample token shadow report must know the pilot renderer exists');
assertIncludes(files.shadow, c.shadow, 'synthFallbackForbiddenForSamples: true', 'sample failover must not degrade into synth fallback');
assertIncludes(files.shadow, c.shadow, 'forbidsGenericSampleSubstitution: true', 'generic sample substitution must remain forbidden');

assertIncludes(files.contract, c.contract, 'resolveWaveStarterSampleBufferToken(args.selection.sampleId)', 'sample voice specs must carry token identity');
assertRegex(files.contract, c.contract, /kind: "sample"[\s\S]*bufferToken: resolveWaveStarterSampleBufferToken/, 'sample VoiceSpec token must be assigned inside sample branch');

assertIncludes(files.sampleBoundary, c.sampleBoundary, 'primeWaveStarterSampleBufferTokenShadow', 'admitted legacy sample playback must prime future Worklet token hydration');
assertIncludes(files.sampleBoundary, c.sampleBoundary, 'targetFreqHz: args.baseFreq', 'sample shadow must know pitch target for playback profile parity');

assertIncludes(files.emitBoundary, c.emitBoundary, 'publishWaveStarterSampleFailoverBlockedUntilHydrated', 'failover branch must publish sample block semantics into the sample-token report');
assertRegex(files.emitBoundary, c.emitBoundary, /voiceSpec\.kind === "sample"[\s\S]*publishWaveStarterSampleFailoverBlockedUntilHydrated[\s\S]*return;/, 'sample failover branch must block and return, not fall through into synth candidate');

assertIncludes(files.workletBridge, c.workletBridge, 'wave-starter-sample-buffer-token-shadow', 'Worklet bridge must accept sample token shadow messages');
assertIncludes(files.workletBridge, c.workletBridge, 'this.sampleBufferTokenShadows = new Map()', 'processor must keep token-keyed buffer bodies');
assertIncludes(files.workletBridge, c.workletBridge, 'sampleRenderingDisabledUntilPilot: false', 'snapshot must declare sample one-shot pilot rendering enabled after hydrated-token candidate acceptance');
assertIncludes(files.workletBridge, c.workletBridge, 'sampleFailoverPilotRendererEnabled: true', 'snapshot must expose the sample pilot renderer flag');
assertIncludes(files.workletBridge, c.workletBridge, 'postWaveStarterWorkletSampleBufferTokenShadow', 'main-thread bridge must post token shadows to the Worklet');
assertIncludes(files.workletBridge, c.workletBridge, 'sampleBufferTokenHydratedCount', 'diagnostics must expose accepted hydrated tokens');

assertIncludes(files.panel, c.panel, 'Wellenstarter Sample-Token', 'Performance & Krisenmanagement must show sample token shadow separately from synth failover');
assertIncludes(files.panel, c.panel, '__XENSONAR_WAVE_STARTER_SAMPLE_BUFFER_TOKEN_SHADOW__', 'UI must publish the sample token report globally');
assertIncludes(files.panel, c.panel, 'formatWaveStarterSampleBufferTokenShadowUiValue', 'UI must format the sample-token report explicitly');

assertIncludes(files.browserProbe, c.browserProbe, 'liveWaveStarterSampleBufferTokenShadow', 'browser probe must read sample token shadow report');
assertIncludes(files.browserProbe, c.browserProbe, 'Wellenstarter Sample-Token', 'browser probe must assert the sample token UI line');
assertIncludes(files.browserProbe, c.browserProbe, 'sampleRendererPilotEnabled === true', 'browser probe must guard that the sample one-shot pilot renderer is visible');
assertIncludes(files.browserProbe, c.browserProbe, 'synthFallbackForbiddenForSamples === true', 'browser probe must guard against sample→synth fallback');

assertRegex(files.packageJson, c.packageJson, /"version": "3\.2\.91\.6\.9\.(160|161|162|163|164|165|166|167|168|169|170|171|172|173|174|175|176|177|178)"/, 'package version must stay at or beyond the 9.160 sample-token-shadow line');
assertIncludes(files.packageJson, c.packageJson, '"xensonar:check-wave-starter-sample-buffer-token-shadow"', 'package script must expose this guard');

console.log('[xensonar-check-wave-starter-sample-buffer-token-shadow] OK: Sample-Wellenstarter now have a real buffer/token shadow contract; audible sample Worklet failover is limited to hydrated-token one-shot pilot rendering.');
