'use strict';
/** A+B is frozen; overlays and descendants must match their explicit source locks.
 * No common historical Git ancestry is asserted.
 */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const ab=require('../../docs/merge/SOURCE_LOCK.json').source_sha256;
const overlay=require('../../docs/merge/UI_C_SOURCE_LOCK.json').added_sources;
const {expected:combined,additions}=require('./source_expectations.cjs');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function verify(overrides={}){
 const actual=[];
 for(const top of ['src','styles']){
  function walk(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){
   const full=path.join(p,e.name);
   if(e.isDirectory())walk(full);
   else if(e.isFile())actual.push(path.relative(root,full).split(path.sep).join('/'));
  }}
  walk(path.join(root,top));
 }
 assert.deepEqual(actual.sort(),Object.keys(combined).sort(),'Unreviewed addition/removal to source tree');
 for(const p of actual)assert.equal(sha(overrides[p]??fs.readFileSync(path.join(root,p))),combined[p],'unreviewed source: '+p);
 return {ab:Object.keys(ab).length,c:Object.keys(overlay).length,descendant:Object.keys(additions).length};
}
const n=verify();assert.equal(n.ab,297);assert.equal(n.c,4);
console.log('PASS A+B+C ancestry and exact descendant source delta:',n.ab,'+',n.c,'+',n.descendant,'fragments');
assert.throws(()=>verify({'src/sessions/v2-session-store.js':'// lose session safety'}),/unreviewed source/);
assert.throws(()=>verify({'src/quickrack/equalizer/eq-worklet.js':'// old worklet'}),/unreviewed source/);
assert.throws(()=>verify({'styles/overlays/nodal/01_nodal_concave_shell_v3.css':'// erase frame'}),/unreviewed source/);
assert.throws(()=>verify({'src/ui/04_header_scrollbar_gauge_sb2.js':'// break header gauge'}),/unreviewed source/);
console.log('PASS mutation controls reject session, DSP and both CSS/JS overlay corruption');

for(const name of Object.keys(additions))assert.throws(()=>verify({[name]:'// corrupt descendant geometry'}),/unreviewed source/);
console.log('PASS mutation controls reject new descendant source corruption');
