'use strict';
const current=require('./nodal-ball-grid-compat.cjs');
const fs=require('fs'),crypto=require('crypto'),assert=require('assert/strict'),base=require('../docs/forge-spatial/baseline.json'),manifest=require('../source-manifest.json');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
for(const [file,hash] of Object.entries(base.hashes)){
 let text=fs.readFileSync(file,'utf8');if(current.anchors[file]){assert.equal(sha(text),current.anchors[file],file);continue;}const contract=base.contracts[file];
 if(contract?.append){assert.ok(text.endsWith(contract.append),'reviewed metadata adapter: '+file);text=text.slice(0,-contract.append.length);}
 for(const replacement of [...(contract?.replacements??[])].reverse()){
  assert.equal(text.split(replacement.new).length-1,replacement.count,'unique reviewed replacement: '+file);text=text.split(replacement.new).join(replacement.old);
 }
 assert.equal(sha(text),hash,'preserve all code outside explicit layout, cursor and pitch-metadata edits: '+file);
}
assert.deepEqual(manifest.files.filter(f=>!base.hashes[f]),current.additions);
console.log('PASS exact reviewed Forge spatial/metadata edits; all other source, synthesis and styles preserved');
