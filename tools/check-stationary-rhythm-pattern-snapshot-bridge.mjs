import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fail = (message) => {
  console.error(`[stationary-rhythm-pattern-snapshot-bridge] FAIL: ${message}`);
  process.exit(1);
};

const requiredFiles = [
  'src/features/xensonar/audio/stationaryRhythmPatternSnapshotBridge.ts',
  'src/features/xensonar/audio/stationaryRhythmWorkletLaneContracts.ts',
  'src/features/xensonar/audio/stationaryRhythmWorkletLaneBridge.ts',
  'src/features/xensonar/audio/stationaryRhythmWorkletProcessorSource.ts',
  'src/features/xensonar/audio/useStationaryRhythmWorkletProbeController.ts',
  'src/features/xensonar/audio/useStationaryRhythmPatternSnapshotInput.ts',
];
for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) fail(`missing ${file}`);
}
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const contracts = read('src/features/xensonar/audio/stationaryRhythmWorkletLaneContracts.ts');
const bridge = read('src/features/xensonar/audio/stationaryRhythmWorkletLaneBridge.ts');
const processor = read('src/features/xensonar/audio/stationaryRhythmWorkletProcessorSource.ts');
const snapshotBridge = read('src/features/xensonar/audio/stationaryRhythmPatternSnapshotBridge.ts');
const hook = read('src/features/xensonar/audio/useStationaryRhythmWorkletProbeController.ts');
const inputHook = read('src/features/xensonar/audio/useStationaryRhythmPatternSnapshotInput.ts');
const app = read('src/App.tsx');

for (const marker of [
  'StationaryRhythmPatternSnapshot',
  'StationaryRhythmPatternHit',
  'stationary-rhythm-pattern-snapshot',
  'transportPolicy',
  'effectiveAtBar',
  'effectiveAtFrame',
]) {
  if (!contracts.includes(marker)) fail(`contracts missing ${marker}`);
}
for (const marker of ['sendPatternSnapshot', 'patternVersion', 'pendingPatternVersion']) {
  if (!bridge.includes(marker)) fail(`bridge missing ${marker}`);
}
for (const marker of [
  'normalizePattern(data)',
  'patternHitsByStep',
  'maybeCommitPendingPattern',
  'spawnPatternVoice',
  'duplicateStepGuardCount',
]) {
  if (!processor.includes(marker)) fail(`processor missing ${marker}`);
}
for (const marker of [
  'buildStationaryRhythmPatternSnapshot',
  'getStaticDrumStepTriggers',
  'buildBassPatternPreviewClip',
  'resolveBassEventFrequencyHz',
]) {
  if (!snapshotBridge.includes(marker)) fail(`snapshot bridge missing ${marker}`);
}
for (const marker of ['patternSnapshotInput', 'patternSnapshotKey', 'buildAndSendPatternSnapshot']) {
  if (!hook.includes(marker)) fail(`hook missing ${marker}`);
}
for (const marker of ['useStationaryRhythmPatternSnapshotInput', 'drumPattern', 'bassPatternMode', 'shadowOnly']) {
  if (!inputHook.includes(marker)) fail(`snapshot input hook missing ${marker}`);
}
for (const forbidden of ['drumMachine.schedulePattern', 'playBassNote(', 'scheduleBassClipStep', 'scheduleClassicBassPatternStep']) {
  if (processor.includes(forbidden)) fail(`processor must not call App/legacy scheduler marker ${forbidden}`);
}
if (!app.includes('stationaryRhythmPatternSnapshotInput')) fail('App.tsx missing minimal pattern snapshot input binding');
console.log('[stationary-rhythm-pattern-snapshot-bridge] PASS');
