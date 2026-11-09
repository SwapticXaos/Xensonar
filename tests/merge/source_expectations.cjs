'use strict';
// Original merge locks remain historical evidence. A descendant records each
// changed parent's exact hash and its replacement, rather than rewriting them.
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..');
const ab=require('../../docs/merge/SOURCE_LOCK.json').source_sha256;
const c=require('../../docs/merge/UI_C_SOURCE_LOCK.json');
const expected={...ab,...c.added_sources};
let patch=null,parent=c.result_html_sha256;const additions={};
for(const name of ['BASS_CARRIER_SOURCE_LOCK.json','CARRIER_POLYPHONY_R2_SOURCE_LOCK.json','UI_R2_INTEGRATION_SOURCE_LOCK.json']){
 const file=path.join(root,'docs/patches',name);if(!fs.existsSync(file))continue;
 const current=JSON.parse(fs.readFileSync(file,'utf8'));
 assert.equal(current.parent_html_sha256,parent,'patch must descend from its actual input');
 for(const [name,change] of Object.entries(current.changed_sources)){
  assert.equal(change.parent_sha256,expected[name],'patch parent differs: '+name);
  assert.match(change.sha256,/^[a-f0-9]{64}$/);expected[name]=change.sha256;
 }
 for(const [name,hash] of Object.entries(current.added_sources??{})){
  assert.equal(expected[name],undefined,'new source already exists: '+name);
  assert.match(hash,/^[a-f0-9]{64}$/);expected[name]=hash;additions[name]=hash;
 }
 parent=current.result_html_sha256;patch=current;
}
module.exports={expected,patch,additions};
