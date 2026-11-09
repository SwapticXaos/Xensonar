import fs from 'node:fs';

const targets = [
  'src/features/xensonar/rooms/ResonanceGrooveBassPanel.tsx',
  'src/features/xensonar/rooms/ResonanceSoundPalettePanel.tsx',
  'src/features/xensonar/rooms/grooveBassPanel/DrumManagerControls.tsx',
  'src/features/xensonar/rooms/grooveBassPanel/BassPatternManagerDialog.tsx',
];
const contractPath = 'src/features/xensonar/rooms/resonancePanelTypedContracts.ts';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

const failures = [];
const contract = read(contractPath);
for (const token of [
  'export type GrooveBassPanelNParams',
  'export type ResonanceSoundPaletteNParams',
  'export type UpdateResonanceNParams',
  'export type OvertoneMixerTarget',
]) {
  if (!contract.includes(token)) failures.push(`${contractPath} missing ${token}`);
}
for (const path of targets) {
  const source = read(path);
  if (!source.includes('resonancePanelTypedContracts')) {
    failures.push(`${path} does not import the shared typed panel contract`);
  }
  for (const forbidden of ['nParamsUI: any', 'updateNParams: (patch: any) => void']) {
    if (source.includes(forbidden)) failures.push(`${path} still contains forbidden weak contract: ${forbidden}`);
  }
}

if (failures.length) {
  console.error('[xensonar] groove/bass/sound typed contract check failed:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('[xensonar] groove/bass/sound typed panel contract OK');
