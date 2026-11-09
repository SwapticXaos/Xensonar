import fs from 'node:fs';

const checks = [
  ['src/features/xensonar/rooms/ResonanceStatusStrip.tsx', 'onOpenMaterialLoopManager'],
  ['src/features/xensonar/rooms/ResonanceStatusStrip.tsx', 'onOpenRootFollowLoopManager'],
  ['src/features/xensonar/rooms/ResonanceMaterialLoopPanel.tsx', 'Loop Upload'],
  ['src/features/xensonar/rooms/ResonanceMaterialLoopPanel.tsx', 'Audio Upload und Schneiden'],
  ['src/features/xensonar/material/materialLoopUploadActions.ts', 'registerUploadedAudioLoop'],
  ['src/features/l3lab/materialIntake/MaterialIntakePanel.tsx', 'Als Root-Follow-Loop verwenden'],
  ['src/features/l3lab/materialIntake/adapters/target/rawRootFollowTargetAdapter.ts', 'rawRootFollowTargetAdapter'],
  ['src/App.tsx', 'xensonar:spectral-forge-audio-cut-upload'],
  ['src/features/xensonar/rooms/Level3LabRoom.tsx', 'externalAudioUploadFile'],
];

let ok = true;
for (const [file, needle] of checks) {
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (!text.includes(needle)) {
    console.error(`[core-loop-entrypoints] missing ${needle} in ${file}`);
    ok = false;
  }
}
if (!ok) process.exit(1);
console.log('[core-loop-entrypoints] OK');
