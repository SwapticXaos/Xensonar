#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function fail(message) { console.error(`[xensonar-check-wave-starter-sample-failover-legacy-parity-probe] ${message}`); process.exit(1); }
function assertIncludes(file, content, needle, reason) { if (!content.includes(needle)) fail(`Missing ${needle} in ${file}: ${reason}`); }
function assertRegex(file, content, regex, reason) { if (!regex.test(content)) fail(`Pattern ${regex} failed in ${file}: ${reason}`); }

const files = {
  probe: 'src/features/xensonar/audio/waveStarterSampleFailoverLegacyParityProbe.ts',
  bridge: 'src/features/xensonar/audio/waveStarterWorkletPilotBridge.ts',
  candidate: 'src/features/xensonar/audio/waveStarterSampleFailoverCandidate.ts',
  tokenShadow: 'src/features/xensonar/audio/waveStarterSampleBufferTokenShadow.ts',
  panel: 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx',
  packageJson: 'package.json',
};
const c = Object.fromEntries(Object.entries(files).map(([key, rel]) => [key, read(rel)]));

assertIncludes(files.probe, c.probe, 'xensonar-wave-starter-sample-failover-legacy-parity-probe', 'probe must publish its own report kind');
assertIncludes(files.probe, c.probe, 'body-parity-observed-through-rendered-token', 'probe must distinguish body proof from mere token readiness');
assertIncludes(files.probe, c.probe, 'worklet-render-frame-observed', 'probe must expose timing/render proof');
assertIncludes(files.probe, c.probe, 'pilot-supported-with-source-context-samplerate-compensation', 'playback-rate parity must reflect samplerate compensation');
assertIncludes(files.probe, c.probe, 'pilot-supported-start-offset-and-crop-window', 'crop/start offset coverage must be explicit');
assertIncludes(files.probe, c.probe, 'not-supported-loop-disabled-in-pilot', 'loop must remain a known gap');
assertIncludes(files.probe, c.probe, 'not-supported-yet-legacy-routing-remains-reference', 'FX/pan/filter gaps must be explicit');
assertIncludes(files.probe, c.probe, 'forbidden-failover-only', 'primary replacement must remain forbidden');
assertIncludes(files.probe, c.probe, 'genericSampleSubstitution: "forbidden"', 'sample substitution must stay forbidden');
assertIncludes(files.probe, c.probe, 'synthFallbackForSamples: "forbidden"', 'sample-to-synth fallback must stay forbidden');
assertIncludes(files.probe, c.probe, 'knownParityGaps', 'probe must carry a compact known-gap list');
assertIncludes(files.probe, c.probe, 'formatWaveStarterSampleFailoverLegacyParityProbeUiValue', 'Krisenmanagement must have a formatter');

assertIncludes(files.bridge, c.bridge, 'const sourceStep = playbackRate * sourceSampleRate / Math.max(1, sampleRate)', 'renderer must keep playback-rate/samplerate relation used by parity probe');
assertIncludes(files.bridge, c.bridge, 'cropStartFrame + offsetFrames', 'renderer must keep refined start offset inside crop window semantics');
assertIncludes(files.bridge, c.bridge, 'loopDisabledInPilot: true', 'Worklet must not silently claim loop parity');
assertIncludes(files.candidate, c.candidate, 'sampleRendererLoopDisabled: true', 'candidate report must keep loop disabled state');
assertIncludes(files.tokenShadow, c.tokenShadow, 'renderPilotOneShotEligible: true', 'token shadow must expose one-shot eligibility');

assertIncludes(files.panel, c.panel, 'buildWaveStarterSampleFailoverLegacyParityProbeReport', 'panel must build the derived parity report');
assertIncludes(files.panel, c.panel, 'Wellenstarter Sample-Parität', 'Krisenmanagement must expose the parity row');
assertIncludes(files.panel, c.panel, '__XENSONAR_WAVE_STARTER_SAMPLE_FAILOVER_LEGACY_PARITY_PROBE__', 'browser global must expose parity probe');
assertIncludes(files.panel, c.panel, 'waveStarterSampleFailoverLegacyParityProbeReport', 'panel must keep the report as a first-class memo');
assertIncludes(files.packageJson, c.packageJson, '"xensonar:check-wave-starter-sample-failover-legacy-parity-probe"', 'package script must expose this guard');
assertRegex(files.packageJson, c.packageJson, /"version": "3\.2\.91\.6\.9\.(?:163|164|165|166|167|168|169|170|171|172|173|174|175|176|177|178)"/, 'package version must be at least the 9.163 parity line');

console.log('[xensonar-check-wave-starter-sample-failover-legacy-parity-probe] OK: Sample-Failover now has a legacy-parity probe that separates body/timing proof from known loop/pan/filter/FX/primary-replacement gaps.');
