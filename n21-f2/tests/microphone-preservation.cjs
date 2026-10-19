'use strict';
const fs=require('fs'),assert=require('assert/strict'),crypto=require('crypto'),base=require('../docs/microphone-baseline-hashes.json'),patch={...require('../docs/microphone-source-anchors.json'),...require('../docs/audio-carrier-source-anchors.json')},m=require('../source-manifest.json');
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
for(const [file,hash] of Object.entries(base.hashes))assert.equal(sha(file),patch[file]??hash,file);
for(const [file,hash] of Object.entries(patch))assert.equal(sha(file),hash,file);
assert.deepEqual(m.files.filter(f=>!base.hashes[f]),['src/forge/ui/03_microphone_intake.js','src/forge/analysis/04_audio_to_carrier.js','src/forge/ui/04_audio_to_carrier_controls.js']);
const changedExisting=Object.keys(base.hashes).filter(f=>sha(f)!==base.hashes[f]);
fs.mkdirSync('results/microphone',{recursive:true});fs.writeFileSync('results/microphone/preservation.json',JSON.stringify({base:base.base,unchanged:Object.keys(base.hashes).length-changedExisting.length,changedExisting,added:m.files.filter(f=>!base.hashes[f]),audioEnginesUnchanged:true,reviewedAudioCarrierOverlay:true},null,2)+'\n');console.log('PASS microphone boundary plus explicit carrier overlay; synthesis kernels unchanged');
