import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const files = [
  'src/features/xensonar/audio/stableMusicLaneContracts.ts',
  'src/features/xensonar/audio/stableMusicLaneWorkletProcessorSource.ts',
  'src/features/xensonar/audio/stableMusicLaneWorkletBridge.ts',
  'src/features/xensonar/audio/stableMusicLaneSnapshotBuilders.ts',
  'src/features/xensonar/audio/useStableMusicLaneRuntimeBoundary.ts',
];
const forbiddenImports = [
  'waveStarterEmitAttackBoundary', 'waveStarter9061DirectContract', 'waveStarterLaneRuntime',
  'waveStarterGradientTonePlayback', 'waveStarterSamplePlaybackBoundary', 'particleAdmissionBoundary',
  'particleNexusToneOrchestrator', 'residentTraffic', 'quantizedCollisionRuntime'
];
for (const file of files) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  for (const marker of forbiddenImports) {
    if (source.includes(`from './${marker}`) || source.includes(`from "./${marker}`) || source.includes(`/${marker}`)) {
      console.error(`[stable-music-lane-no-wavestarter-particle] FAIL: ${file} imports/reaches ${marker}`);
      process.exit(1);
    }
  }
}
const contracts = fs.readFileSync(path.join(root, 'src/features/xensonar/audio/stableMusicLaneContracts.ts'), 'utf8');
if (!contracts.includes("| 'beat'")) { /* tolerate tuple-derived id */ }
if (contracts.includes("| 'wellenstarter'") || contracts.includes("| 'particle'")) {
  console.error('[stable-music-lane-no-wavestarter-particle] FAIL: StableMusicLaneId includes expressive lanes');
  process.exit(1);
}
console.log('[stable-music-lane-no-wavestarter-particle] PASS expressive Wellenstarter/Partikel paths stay outside StableMusicLane');
