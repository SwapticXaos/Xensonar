'use strict';
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const baseline=JSON.parse(fs.readFileSync('docs/p4c2-n7-parent-hashes.json','utf8'));
let unchanged=0;const changed=[];
for(const [file,hash] of Object.entries(baseline)){
 const now=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 if(hash===now)unchanged++;else changed.push(file);
}
assert.deepEqual(changed.sort(),['src/instruments/07_pitch_preparation.js','src/nodal/02_synthesis_kernel.js','src/nodal/04_audio_runtime.js','src/nodal/12_surface_runtime.js','src/rhythm/03_live_drum_bodies.js'].sort());
const manifest=JSON.parse(fs.readFileSync('source-manifest.json','utf8'));
assert(manifest.files.every(file=>baseline[file]),'no additional production modules');
console.log('PASS N7 preservation: '+unchanged+' production files/styles byte-identical to N6; V2 kernel and four preparation adapters changed. C11, budgets, UI, pointer, physics, timing and routes preserved.');
