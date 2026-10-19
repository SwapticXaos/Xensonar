'use strict';
const fs=require('fs'),crypto=require('crypto'),assert=require('assert/strict');
const base=require('../docs/forge-progress-baseline-hashes.json'),patch=require('../docs/forge-progress-source-anchors.json'),m=require('../source-manifest.json');
const controls={...require('../docs/live-controls-source-anchors.json'),...require('../docs/ui-refinement-source-anchors.json')};
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
let unchanged=0;for(const [file,expected] of Object.entries(base.hashes)){assert.equal(hash(file),controls[file]??patch[file]??expected,'unreviewed change: '+file);if(!patch[file]&&!controls[file])unchanged++;}
for(const [file,expected] of Object.entries(patch))assert.equal(hash(file),controls[file]??expected,'reviewed Forge source: '+file);
assert.deepEqual(m.files.filter(f=>!base.hashes[f]),['src/mix/04_melodic_spatial.js','src/audio/drone/01_colour.js','src/forge/dsp/04_polytrace_render.js'],'only reviewed offline renderer and Live Controls modules are added');
assert.equal(hash('src/nodal/02_synthesis_kernel.js'),controls['src/nodal/02_synthesis_kernel.js']??base.hashes['src/nodal/02_synthesis_kernel.js'],'only reviewed Nodal envelope-zero guard is permitted');
fs.mkdirSync('results/forge-progress',{recursive:true});fs.writeFileSync('results/forge-progress/preservation.json',JSON.stringify({base:base.base,unchanged,changed:Object.keys(patch).filter(f=>base.hashes[f]),added:m.files.filter(f=>!base.hashes[f]),status:'PASS'},null,2)+'\n');
console.log('PASS Forge patch boundary:',unchanged,'source/style/template files unchanged outside Forge and Live Controls patch owners');
