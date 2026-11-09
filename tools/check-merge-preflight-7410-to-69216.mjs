#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fail = (message) => {
  console.error(`[merge-preflight-7410-to-69216] FAIL: ${message}`);
  process.exit(1);
};
const read = (rel) => {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) fail(`Missing required file: ${rel}`);
  return fs.readFileSync(file, 'utf8');
};
const readJson = (rel) => JSON.parse(read(rel));

const pkg = readJson('package.json');
const ownMap = readJson('reports/merge-prep/3.2.91.7.4.11_audio_branch_to_6.9.216_preflight.json');
const targetMap = readJson('reports/merge-prep/imported_3.2.91.6.9.216_target_branch_map.json');
const ownMd = read('reports/merge-prep/3.2.91.7.4.11_audio_branch_to_6.9.216_preflight.md');
const importedMd = read('reports/merge-prep/imported_3.2.91.6.9.216_target_branch_map.md');

if (pkg.version !== '3.2.91.7.4.11') fail(`package.json version must be 3.2.91.7.4.11, got ${pkg.version}`);
if (ownMap.schema !== 'xensonar-merge-preflight-audio-to-material-refactor/v1') fail('Unexpected own preflight schema.');
if (ownMap.mergeMode !== 'preflight-only-no-final-merge') fail('Preflight map must explicitly be non-final merge.');
if (ownMap.sourceBranch !== '3.2.91.7.4.10_normal_hold_9061_direct_pulses') fail('Unexpected source branch marker.');
if (ownMap.targetBranch !== '3.2.91.6.9.216_merge_preflight_branch_map') fail('Unexpected target branch marker.');
if (targetMap.schema !== 'xensonar-merge-preflight-branch-map/v1') fail('Imported target map schema mismatch.');
if (targetMap.generatedFor !== '3.2.91.6.9.216_merge_preflight_branch_map') fail('Imported target map must be the 6.9.216 map.');

const requiredScripts = [
  'xensonar:check-keyboard-9061-fastpath-rfl-off',
  'xensonar:check-wsb-position-contract-rfl-reads-ball',
  'xensonar:check-wavestarter-9061-voice-window-contract',
  'xensonar:check-wavestarter-hold-path-forensics',
  'xensonar:check-wavestarter-normal-hold-9061-direct-pulses',
  'xensonar:check-merge-preflight-7410-to-69216',
];
for (const script of requiredScripts) {
  if (!pkg.scripts?.[script]) fail(`Missing required script: ${script}`);
}

const audioContracts = (ownMap.sourceAudioContractsToPreserve ?? []).map((entry) => `${entry.id} ${entry.guard}`).join('\n');
for (const marker of [
  '7.4.6-keyboard-9061-fastpath-rfl-off',
  '7.4.7-wsb-position-contract',
  '7.4.8-9061-voice-window',
  '7.4.9-hold-path-forensics',
  '7.4.10-normal-hold-9061-direct-pulses',
]) {
  if (!audioContracts.includes(marker)) fail(`Missing protected audio contract marker: ${marker}`);
}

const targetFunctionalTitles = (targetMap.functionalChanges ?? []).map((entry) => entry.title).join('\n');
for (const marker of ['Cut upload route override', 'Real export title + sample library UI', 'Sample menu viewport + header Rec/Stop']) {
  if (!targetFunctionalTitles.includes(marker)) fail(`Imported 6.9.216 target map missing functional marker: ${marker}`);
}

const nonGoals = (targetMap.nonGoals ?? []).join('\n');
for (const marker of ['Keine AudioEngine', 'Keine Root-Follow', 'Keine Materialspur']) {
  if (!nonGoals.includes(marker)) fail(`Imported target map missing audio non-goal marker: ${marker}`);
}

const likelyConflicts = JSON.stringify(ownMap.likelyConflictZones ?? []);
for (const marker of [
  'src/App.tsx',
  'src/features/l3lab/canonicalForge/CanonicalForgeRoom.tsx',
  'src/features/l3lab/materialIntake/MaterialIntakePanel.tsx',
  'src/features/l3lab/canonicalForge/melodicLoopPanel.tsx',
]) {
  if (!likelyConflicts.includes(marker)) fail(`Own preflight missing likely conflict policy for ${marker}`);
}

for (const marker of [
  'preflight-only-no-final-merge',
  'RFL wieder an Keyboard-Schlag/Admission',
  'normalem Hold in worklet-instrument-engine-submission',
  'neuer Event-Rate-Tuersteher',
]) {
  if (!JSON.stringify(ownMap).includes(marker)) fail(`Own preflight missing forbidden/regression marker: ${marker}`);
}

const app = read('src/App.tsx');
const audioLaneContracts = read('src/features/xensonar/audio/audioLaneContracts.ts');
const bridge = read('src/features/xensonar/input/waveStarterGestureLoopWorkletBridge.ts');
const wsb = read('src/features/xensonar/input/wellenstarterBallPositionContract.ts');
const forensics = read('src/features/xensonar/input/waveStarterHoldPathForensics.ts');

for (const marker of [
  '...XENSONAR_TRANSIENT_RUNTIME_VOICE_LIMITS',
  'sourceMinOccupancyMs: XENSONAR_TRANSIENT_RUNTIME_VOICE_WINDOWS_MS',
]) {
  if (!app.includes(marker)) fail(`App must preserve 7.4.8 transient runtime wiring marker: ${marker}`);
}
for (const marker of ['softLimit: 52', 'hardLimit: 84', 'wave: 22', 'wave: 24']) {
  if (!audioLaneContracts.includes(marker)) fail(`Audio lane contract missing 90.61 voice/window marker: ${marker}`);
}
if (!wsb.includes('resolveKeyboardWellenstarterBallPosition')) fail('WSB position contract helper missing.');
for (const marker of ['hold-gesture-loop-9061-direct-pulse', 'workletBridge: false', 'workletFirst: false']) {
  if (!bridge.includes(marker)) fail(`Normal hold direct pulse marker missing: ${marker}`);
}
if (!forensics.includes('legacy-or-direct-hold-reference')) fail('Hold forensics must keep legacy/direct inference marker.');

for (const marker of [
  '# Xensonar 3.2.91.7.4.11',
  'kein finaler Merge',
  '7.4.10 schuetzt',
  '6.9.216 liefert',
  'App.tsx',
  'Audio-Hotpath nein',
]) {
  if (!ownMd.includes(marker)) fail(`Own markdown report missing marker: ${marker}`);
}
for (const marker of [
  '# Xensonar 3.2.91.6.9.215',
  '## Funktionale Aenderungen',
  '## Merge-Hotspots',
]) {
  if (!importedMd.includes(marker)) fail(`Imported markdown report missing marker: ${marker}`);
}

console.log('[merge-preflight-7410-to-69216] PASS');
