'use strict';
const fs=require('fs'),crypto=require('crypto'),assert=require('assert/strict'),base=require('../docs/workflow-integrity-baseline-hashes.json'),patch={...require('../docs/workflow-integrity-source-anchors.json'),...require('../docs/maintenance-source-anchors.json'),...require('../docs/microphone-source-anchors.json'),...require('../docs/audio-carrier-source-anchors.json')},m=require('../source-manifest.json');
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
let unchanged=0;
for(const [file,hash] of Object.entries(base.hashes)){assert.equal(sha(file),patch[file]??hash,file);if(!patch[file])unchanged++;}
for(const [file,hash] of Object.entries(patch))assert.equal(sha(file),hash,file);
assert.deepEqual(m.files.filter(f=>!base.hashes[f]),["src/mix/05_grid_runtime.js","src/mix/06_custom_instruments.js","src/forge/ui/03_microphone_intake.js","src/forge/analysis/04_audio_to_carrier.js","src/forge/ui/04_audio_to_carrier_controls.js"]);
for(const file of ['src/nodal/02_synthesis_kernel.js','src/audio/05_sample_granular_hold.js','src/audio/rfl/01_resident_worklet.js','src/audio/rfl/02_fragment_preparation.js','src/audio/drone/01_colour.js','src/audio/entrophon/01_wasm_asset.js','src/forge/dsp/04_polytrace_render.js'])assert.equal(sha(file),base.hashes[file],'synthesis implementation remains unchanged: '+file);
fs.mkdirSync('results/workflow-integrity',{recursive:true});fs.writeFileSync('results/workflow-integrity/preservation.json',JSON.stringify({base:base.base,unchanged,reviewed:Object.keys(patch),synthesisKernelsUnchanged:true},null,2)+'\n');console.log('PASS workflow boundary:',unchanged,'existing files unchanged;',Object.keys(patch).length,'reviewed files including two new administrative modules');
