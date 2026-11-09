#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = {
  spec: path.join(root, 'src/features/xensonar/audio/waveStarterVoiceSpecFailoverContract.ts'),
  emit: path.join(root, 'src/features/xensonar/audio/waveStarterEmitAttackBoundary.ts'),
  bridge: path.join(root, 'src/features/xensonar/audio/waveStarterWorkletPilotBridge.ts'),
  panel: path.join(root, 'src/features/xensonar/performanceCrisis/ui/PerformanceCrisisManagementPanel.tsx'),
  browserProbe: path.join(root, 'tools/check-stable-lane-browser-responsibility-readout.mjs'),
  packageJson: path.join(root, 'package.json'),
};
const missing = [];
for (const [name, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) missing.push(`missing ${name} file ${file}`);
}
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const spec = read(files.spec);
const emit = read(files.emit);
const bridge = read(files.bridge);
const panel = read(files.panel);
const browserProbe = read(files.browserProbe);
const pkg = JSON.parse(read(files.packageJson) || '{}');
function must(text, marker, label) {
  if (!text.includes(marker)) missing.push(`${label} missing marker: ${marker}`);
}

must(spec, 'WaveStarterSynthVoiceSpec', 'voice spec contract');
must(spec, 'WaveStarterSampleVoiceSpec', 'voice spec contract');
must(spec, 'sample-buffer-transfer-required', 'sample failover must require buffer transfer');
must(spec, 'synth-parameter-spec-ready', 'synth failover parity marker');
must(spec, 'primaryReplacementForbidden: true', 'primary replacement guard');
must(spec, 'parallelMixIsProofOnly: true', 'parallel proof-only guard');
must(spec, 'forbidsGenericSampleSubstitution: true', 'generic sample substitution guard');
must(spec, 'formatWaveStarterVoiceSpecFailoverContractUiValue', 'voice spec UI formatter');
must(spec, '__XENSONAR_WAVE_STARTER_VOICE_SPEC_FAILOVER_CONTRACT__', 'voice spec browser global');
must(emit, 'buildWaveStarterVoiceSpec', 'emit path builds canonical spec');
must(emit, 'resolveWaveStarterVoiceSpecSourceIntent', 'emit path resolves direct/deferred/microrelease intent');
must(emit, 'postWaveStarterWorkletVoiceSpecShadow', 'emit path mirrors spec to worklet shadow');
must(emit, 'publishWaveStarterVoiceSpecFailoverContract', 'emit path publishes contract report');
must(bridge, 'wave-starter-voice-spec-shadow', 'worklet bridge accepts voice spec mirror');
must(bridge, 'voiceSpecMirrorAcceptedCount', 'worklet bridge reports voice spec mirror acks');
must(bridge, 'lastVoiceSpecKind', 'worklet bridge reports synth/sample kind');
must(panel, 'Wellenstarter VoiceSpec', 'performance UI shows voice spec report');
must(panel, 'readWaveStarterVoiceSpecFailoverContractFromBrowser', 'panel reads voice spec report');
must(panel, '__XENSONAR_WAVE_STARTER_VOICE_SPEC_FAILOVER_CONTRACT__', 'panel publishes voice spec global');
must(browserProbe, '__XENSONAR_WAVE_STARTER_VOICE_SPEC_FAILOVER_CONTRACT__', 'browser probe reads voice spec global');
must(browserProbe, 'Wellenstarter VoiceSpec', 'browser probe reads voice spec UI label');

if (!pkg.scripts?.['xensonar:check-wave-starter-voice-spec-failover-contract']) {
  missing.push('package script xensonar:check-wave-starter-voice-spec-failover-contract missing');
}


if (missing.length) {
  console.error('[check-wave-starter-voice-spec-failover-contract] FAIL');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}
console.log('[check-wave-starter-voice-spec-failover-contract] OK: synth/sample Wellenstarter VoiceSpec contract is mirrored, reported, and forbids generic sample substitution before buffer transfer.');
