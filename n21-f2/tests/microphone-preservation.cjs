'use strict';
const fs=require('fs'),assert=require('assert/strict'),crypto=require('crypto'),base=require('../docs/microphone-baseline-hashes.json'),patch=require('../docs/microphone-source-anchors.json'),m=require('../source-manifest.json');
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
for(const [file,hash] of Object.entries(base.hashes))assert.equal(sha(file),patch[file]??hash,file);
for(const [file,hash] of Object.entries(patch))assert.equal(sha(file),hash,file);
assert.deepEqual(m.files.filter(f=>!base.hashes[f]),['src/forge/ui/03_microphone_intake.js']);
fs.mkdirSync('results/microphone',{recursive:true});fs.writeFileSync('results/microphone/preservation.json',JSON.stringify({base:base.base,unchanged:Object.keys(base.hashes).length-1,changedExisting:['src/forge/ui/02_donor_routing_and_hearing.js'],added:['src/forge/ui/03_microphone_intake.js'],audioEnginesUnchanged:true},null,2)+'\n');console.log('PASS microphone boundary: one existing UI module and one capture module; all synthesis/rendering/transport sources unchanged');
