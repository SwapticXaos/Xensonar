import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const fail = (message) => {
  console.error(`[check-wavestarter-9061-silent-transient-hot-path] FAIL: ${message}`);
  process.exit(1);
};

const app = read('src/App.tsx');
if (!app.includes('silentHotPathSources: { wave: true }')) {
  fail('TransientRuntime / scheduled-tone deps must mark wave as silent hot path.');
}

const enqueueStart = app.indexOf('const enqueueWaveOvertoneArp =');
const enqueueEnd = app.indexOf('buildAppResonanceManualGridActionPorts({', enqueueStart);
if (enqueueStart < 0 || enqueueEnd < 0) fail('enqueueWaveOvertoneArp boundary not found.');
const enqueueSlice = app.slice(enqueueStart, enqueueEnd);
if (enqueueSlice.includes('markWaveOvertoneArpEnqueue({')) {
  fail('Wellenstarter overtone enqueue hot path must not publish traffic-forensics objects.');
}
if (!enqueueSlice.includes('waveOvertoneArpQueueRef.current.splice(0, overflowTrimmed)')) {
  fail('Queue trimming must stay even when traffic-forensics enqueue publishing is silent.');
}

const overtoneStart = app.indexOf('startWaveOvertoneArpRuntime({');
const overtoneEnd = app.indexOf('beginTransientEvent: (source, requestedVoices, intensity)', overtoneStart);
if (overtoneStart < 0 || overtoneEnd < 0) fail('startWaveOvertoneArpRuntime refs block not found.');
const overtoneRefs = app.slice(overtoneStart, overtoneEnd);
if (overtoneRefs.includes('trafficRef: audioTrafficForensicsRef')) {
  fail('Wellenstarter overtone runtime must not feed traffic forensics in the silent hot-path contract.');
}

const transient = read('src/features/resonance/transientRuntime.ts');
for (const required of [
  'silentHotPathSources?: Partial<Record<TransientSource, boolean>>',
  'const isSilentHotPathSource = (source: TransientSource): boolean',
  'recordAdaptiveForSource(source, \'transient-reduced-event\'',
  'recordAdaptiveForSource(plan.source, \'transient-dropped-voice\'',
  'recordAdaptiveForSource(handle.source, \'transient-send-gated\'',
  'const externalPressureBias = isSilentHotPathSource(source)',
]) {
  if (!transient.includes(required)) fail(`transient runtime silent source hook missing: ${required}`);
}

const scheduled = read('src/features/xensonar/audio/scheduledTonePlaybackBoundary.ts');
for (const required of [
  'silentHotPathSources?: Partial<Record<TransientSource, boolean>>',
  'const isSilentHotPathSource = request.options?.source',
  'const noopRecordCount: typeof recordAudioPressureCount = () => undefined',
  'const noopRecordAdaptiveAction: typeof recordAudioPressureAdaptiveAction = () => undefined',
]) {
  if (!scheduled.includes(required)) fail(`scheduled tone silent hook missing: ${required}`);
}
const mainOutputIdx = scheduled.indexOf('const mainOutput = deps.getMainOutput(deps.ctx);');
const staleDropIdx = scheduled.indexOf('safe-envelope-stale-dropped');
if (mainOutputIdx < 0 || staleDropIdx < 0 || mainOutputIdx < staleDropIdx) {
  fail('scheduled-tone output bus should be resolved only after stale/admission gates.');
}

const emit = read('src/features/xensonar/audio/waveStarterEmitAttackBoundary.ts');
const directStart = emit.indexOf('function emitWaveStarter9061DirectAttack');
const directEnd = emit.indexOf('export function emitWaveStarterAttack', directStart);
if (directStart < 0 || directEnd < 0) fail('9061 direct attack function not found.');
const directSlice = emit.slice(directStart, directEnd);
for (const required of [
  'primeTokenShadow: false',
  'silentHotPath: true',
  'transientRuntime.canAdmitVoice("wave")',
]) {
  if (!directSlice.includes(required)) fail(`9061 direct function missing silent contract fragment: ${required}`);
}
for (const forbidden of [
  'buildWaveStarterVoiceSpec',
  'postWaveStarterWorkletVoiceSpecShadow',
  'publishWaveStarterFailoverDecisionGate',
  'recordWaveStarterFailoverGateLedgerEntry',
  'recordAudioPressureAdaptiveAction',
]) {
  if (directSlice.includes(forbidden)) fail(`9061 direct function must not contain ${forbidden}`);
}

const sample = read('src/features/xensonar/audio/waveStarterSamplePlaybackBoundary.ts');
if (!sample.includes('primeTokenShadow?: boolean') || !sample.includes('if (args.primeTokenShadow !== false)')) {
  fail('sample playback boundary must allow direct path to bypass token-shadow priming.');
}

const gradient = read('src/features/xensonar/audio/waveStarterGradientTonePlayback.ts');
if (!gradient.includes('silentHotPath?: boolean') || !gradient.includes('recordHotPathCount')) {
  fail('gradient tone playback must suppress pressure-map writes for silent hot path.');
}

console.log('[check-wavestarter-9061-silent-transient-hot-path] OK: Wellenstarter 90.61 direct path keeps gates but suppresses hot-path telemetry/traffic/shadow side effects.');
