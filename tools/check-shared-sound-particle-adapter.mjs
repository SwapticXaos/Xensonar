import fs from 'node:fs';

const catalogPath = 'src/features/soundLibrary/sharedSoundCatalog.ts';
const adapterPath = 'src/features/soundLibrary/particleSoundAdapter.ts';
const catalog = fs.readFileSync(catalogPath, 'utf8');
const adapter = fs.readFileSync(adapterPath, 'utf8');

const requiredCatalogFragments = [
  'particlePresetId?: ParticlePreset | null;',
  'particlePresetId: entry.value,',
  'particlePresetId: String(entry.collision.preset).includes',
];
const requiredAdapterFragments = [
  'shared?.particlePresetId',
  'presetId: shared.particlePresetId',
];

const missing = [];
for (const fragment of requiredCatalogFragments) {
  if (!catalog.includes(fragment)) missing.push(`${catalogPath}: missing ${fragment}`);
}
for (const fragment of requiredAdapterFragments) {
  if (!adapter.includes(fragment)) missing.push(`${adapterPath}: missing ${fragment}`);
}

if (missing.length) {
  console.error('Shared sound particle adapter contract failed:');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Shared sound particle adapter contract OK');
