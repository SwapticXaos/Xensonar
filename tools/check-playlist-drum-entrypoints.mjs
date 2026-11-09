import fs from 'node:fs';

const checks = [
  ['src/features/xensonar/material/playlistDropOperation.ts', 'encodePlaylistDropTarget'],
  ['src/features/xensonar/material/playlistDropOperation.ts', 'insert-before'],
  ['src/features/xensonar/material/materialLoopManagerActions.ts', 'swapMaterialEntries'],
  ['src/features/xensonar/material/playlistDropOperation.ts', 'Reinschieben'],
  ['src/features/xensonar/material/playlistDropOperation.ts', 'Tauschen'],
  ['src/features/xensonar/rooms/GridTuningRackDialog.tsx', 'insert-before'],
  ['src/features/xensonar/rooms/ResonanceGrooveBassPanel.tsx', 'DrumPatternManagerDialog'],
  ['src/features/xensonar/rooms/ResonanceGrooveBassPanel.tsx', 'OPEN_DRUM_PATTERN_MANAGER_EVENT'],
  ['src/features/xensonar/rooms/ResonanceGrooveBassPanel.tsx', 'Drum Pattern verwalten'],
  ['src/features/xensonar/rooms/ResonanceGrooveBassPanel.tsx', 'Drum Pattern'],
  ['src/features/xensonar/rooms/ResonanceStatusStrip.tsx', 'Drum Pattern verwalten'],
  ['src/features/xensonar/rooms/ResonanceStatusStrip.tsx', 'Raster Werkbank öffnen'],
  ['src/App.tsx', 'event.shiftKey ? -1 : 1'],
  ['src/features/xensonar/material/materialLoopRoleFilters.ts', 'isRootFollowOnlyMaterialLoop'],
];

const forbiddenUiFragments = [
  ['src/features/xensonar/rooms/ResonanceGrooveBassPanel.tsx', 'Drum Quelle'],
];

const failures = [];
for (const [file, needle] of checks) {
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (!text.includes(needle)) failures.push(`${file} missing ${needle}`);
}
for (const [file, needle] of forbiddenUiFragments) {
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (text.includes(needle)) failures.push(`${file} still exposes forbidden UI fragment ${needle}`);
}

if (failures.length) {
  console.error('[check-playlist-drum-entrypoints] failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('[check-playlist-drum-entrypoints] ok');
