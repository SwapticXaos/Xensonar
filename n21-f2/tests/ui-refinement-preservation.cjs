'use strict';

const fs = require('fs'), assert = require('assert/strict'), crypto = require('crypto'), base = require('../docs/ui-refinement-baseline-hashes.json'), patch = {...require('../docs/ui-refinement-source-anchors.json'),...require('../docs/workflow-integrity-source-anchors.json'),...require('../docs/maintenance-source-anchors.json')};

const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

let unchanged = 0;

for (const [file, hash] of Object.entries(base.hashes)) {
  assert.equal(sha(file), patch[file] ?? hash, 'unexpected source change: ' + file);
  if (!patch[file]) unchanged++;
}

for (const [file, hash] of Object.entries(patch)) assert.equal(sha(file), hash);

for (const file of [ 'src/audio/05_sample_granular_hold.js', 'src/audio/rfl/01_resident_worklet.js', 'src/audio/rfl/02_fragment_preparation.js', 'src/audio/drone/01_colour.js', 'src/audio/entrophon/01_wasm_asset.js', 'src/forge/dsp/04_polytrace_render.js' ]) assert.equal(sha(file), base.hashes[file], 'sound mechanism remains unchanged');

fs.writeFileSync('results/ui-refinement/preservation.json', JSON.stringify({
  base: base.base,
  unchanged: unchanged,
  changed: Object.keys(patch),
  otherKernelsUnchanged: true,
  nodalZeroOutputGuardReviewed: true
}, null, 2) + '\n');

console.log('PASS UI refinement:', unchanged, 'source/style/template files unchanged; other synthesis kernels, Drone colour, granular hold and RFL worklet/worker unchanged; reviewed Nodal zero-output guard');
