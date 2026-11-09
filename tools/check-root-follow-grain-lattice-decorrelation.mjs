import fs from 'node:fs';

const files = {
  lattice: 'src/features/l3lab/canonicalForge/materialElasticGrainLattice.ts',
  elastic: 'src/features/l3lab/canonicalForge/canonicalPreviewMaterialElastic.ts',
  synth: 'src/features/xensonar/rootFollow/rootFollowSynthRenderer.ts',
  settings: 'src/features/xensonar/rootFollow/rootFollowGranularSettings.ts',
};

for (const [label, path] of Object.entries(files)) {
  if (!fs.existsSync(path)) throw new Error(`[grain-lattice] missing ${label}: ${path}`);
}

const lattice = fs.readFileSync(files.lattice, 'utf8');
const elastic = fs.readFileSync(files.elastic, 'utf8');
const synth = fs.readFileSync(files.synth, 'utf8');
const settings = fs.readFileSync(files.settings, 'utf8');

const requiredLattice = [
  'stableElasticPhaseNoise',
  'makeMaterialElasticWindowSeed',
  'applyMaterialElasticGrainTimeDither',
  'materialElasticGrainSourceDitherSec',
];
for (const token of requiredLattice) {
  if (!lattice.includes(token)) throw new Error(`[grain-lattice] lattice module missing ${token}`);
}

for (const token of ['grainTimeDitherMs', 'grainSourceDitherMs']) {
  if (!settings.includes(token)) throw new Error(`[grain-lattice] render tuning missing ${token}`);
  if (!elastic.includes(token)) throw new Error(`[grain-lattice] material elastic tuning missing ${token}`);
}

for (const [label, source] of [['material', elastic], ['direct-sample', synth]]) {
  for (const token of ['applyMaterialElasticGrainTimeDither', 'materialElasticGrainSourceDitherSec', 'makeMaterialElasticWindowSeed']) {
    if (!source.includes(token)) throw new Error(`[grain-lattice] ${label} path does not use ${token}`);
  }
}

console.log('[grain-lattice] ok');
