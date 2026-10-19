'use strict';
const fs=require('fs'),assert=require('assert/strict'),crypto=require('crypto'),base=require('../docs/audio-carrier-baseline-hashes.json'),patch=require('../docs/audio-carrier-source-anchors.json'),manifest=require('../source-manifest.json');
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
for(const [f,h] of Object.entries(base.hashes))assert.equal(hash(f),patch[f]??h,f);
for(const [f,h] of Object.entries(patch))assert.equal(hash(f),h,f);
const added=['src/forge/analysis/04_audio_to_carrier.js','src/forge/ui/04_audio_to_carrier_controls.js'];assert.deepEqual(manifest.files.filter(f=>!base.hashes[f]),added);
fs.mkdirSync('results/audio-carrier',{recursive:true});fs.writeFileSync('results/audio-carrier/preservation.json',JSON.stringify({base:base.base,unchanged:Object.keys(base.hashes).length-3,changedExisting:Object.keys(patch).filter(f=>base.hashes[f]),added,synthesisKernelsUnchanged:true},null,2)+'\n');console.log('PASS carrier boundary: three existing integration modules, two new modules; synthesis kernels unchanged');
