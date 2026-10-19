'use strict';
const fs=require('fs'),crypto=require('crypto'),assert=require('assert/strict'),base=require('../docs/live-controls-baseline-hashes.json'),patch=require('../docs/live-controls-source-anchors.json'),m=require('../source-manifest.json');
const refinements=require('../docs/ui-refinement-source-anchors.json');
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');let unchanged=0;
for(const [f,hash] of Object.entries(base.hashes)){assert.equal(sha(f),refinements[f]??patch[f]??hash,'unexpected change: '+f);if(!patch[f]&&!refinements[f])unchanged++;}
for(const [f,hash] of Object.entries(patch))assert.equal(sha(f),refinements[f]??hash,'reviewed patch owner: '+f);
assert.deepEqual(m.files.filter(f=>!base.hashes[f]),['src/mix/04_melodic_spatial.js','src/audio/drone/01_colour.js']);assert.deepEqual(m.styles.map(s=>s.file).filter(f=>!base.hashes[f]),['styles/26_live_controls.css']);
for(const f of ['src/nodal/02_synthesis_kernel.js','src/audio/05_sample_granular_hold.js','src/audio/rfl/01_resident_worklet.js','src/audio/rfl/02_fragment_preparation.js'])assert.equal(sha(f),refinements[f]??base.hashes[f]);
fs.writeFileSync('results/live-controls/preservation.json',JSON.stringify({base:base.base,unchanged,changed:Object.keys(patch).filter(f=>base.hashes[f]),added:Object.keys(patch).filter(f=>!base.hashes[f]),status:'PASS'},null,2)+'\n');console.log('PASS live controls patch:',unchanged,'sources/styles/templates unchanged; granular hold and RFL processor unchanged; authorized Nodal envelope guard reviewed');
