'use strict';
const spatial=require('./forge-spatial-compat.cjs');
const fs=require('fs'),crypto=require('crypto'),assert=require('assert/strict'),ts=require('typescript'),base=require('../docs/shared-history/baseline.json'),manifest=require('../source-manifest.json'),anchors=require('../docs/shared-history/source-anchors.json');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
for(const [file,hash] of Object.entries(base.hashes)){
 const data=fs.readFileSync(file);if(spatial.anchors[file]){assert.equal(sha(data),spatial.anchors[file],file);continue;}const contract=base.contracts[file];if(!contract){assert.equal(sha(data),hash,'preserve supplied patch/DSP/UI: '+file);continue;}
 assert.equal(sha(require('./shared-history-structure.cjs')(data.toString(),contract)),contract.outsideHash,'only reviewed history/audibility/sample/stop adapters may change');
}
assert.deepEqual(manifest.files.filter(f=>!base.hashes[f]),['src/storage/07_history_snapshots.js',...spatial.additions]);for(const [file,hash] of Object.entries(anchors))assert.equal(sha(fs.readFileSync(file)),hash,file);
console.log('PASS all four supplied patches retained; only reviewed history/audibility/sample adapters and one new history module change afterward');
