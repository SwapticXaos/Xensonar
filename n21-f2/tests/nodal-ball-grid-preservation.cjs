'use strict';
const fs=require('fs'),crypto=require('crypto'),assert=require('assert/strict'),base=require('../docs/nodal-ball-grid/baseline.json'),m=require('../source-manifest.json');
const current=require('./p7-review-preservation.cjs');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
for(const [file,hash]of Object.entries(base.hashes)){
 let text=fs.readFileSync(file,'utf8');if(current.anchors[file]){assert.equal(sha(text),current.anchors[file]);continue;}
 for(const replacement of [...(base.contracts[file]?.replacements??[])].reverse()){
  assert.equal(text.split(replacement.new).length-1,replacement.count,'unique Installation integration: '+file);text=text.split(replacement.new).join(replacement.old);
 }
 assert.equal(sha(text),hash,'all other synthesis, ball motion, resident behavior, main grid and UI preserved: '+file);
}
assert.deepEqual(m.files.filter(file=>!base.hashes[file]),current.additions);
assert.equal(sha(fs.readFileSync('tests/fixtures/nodal-ball-grid/myzel-g-before.js')),base.hashes['src/audio/09_myzel_g_dsp.js']);
console.log('PASS bounded Ball controls/grid integration, unchanged main tuning engine and preserved original G kernel fixture');
