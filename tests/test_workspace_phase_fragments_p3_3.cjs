'use strict';
// P3.3 RED/GREEN: once-per-phase status projection without modifying storage/order.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const context=vm.createContext({Object,TypeError});
vm.runInContext(read('src/contracts/12_workspace_result_projection.js'),context);
const api=vm.runInContext('__XenWorkspaceResultProjectionP32',context);
assert.equal(typeof api.fragment,'function','P3.3 requires a pure phase-fragment projector');
const sample=(g,y,x)=>g||x||y?' · '+(g?g+' samples replaced incrementally':'')+(y?(g?' · ':'')+y+' samples already present':'')+(x?' · '+x+' old sample copies removed':''):'';
for(const g of [0,1,3])for(const y of [0,1,7])for(const x of [0,2]){
  assert.equal(api.fragment('sample',{replaced:g,reused:y,deduped:x}),sample(g,y,x));
}
assert.equal(api.fragment('grid',null),'');
for(const replaced of [false,true])for(const imported of [0,2])for(const slots of [0,3]){
 const a={importedCount:imported,mode:replaced?'replace':'merge',nextRack:Array(slots).fill('12edo')};
 assert.equal(api.fragment('grid',a),` · ${imported} grids imported${replaced?` · ${slots} Rack-Slots`:''}`);
}
for(const saved of [null,{importedCount:0,skippedCount:0,replacedCount:0},{importedCount:5,skippedCount:3,replacedCount:1}])
 for(const restoredCurrent of [false,true]){
  const legacy=saved?` · ${saved.importedCount} saved Synthetic Forge workspaces imported${saved.skippedCount?` · ${saved.skippedCount} already present`:''}${saved.replacedCount?` · ${saved.replacedCount} replaced`:''}${restoredCurrent?' · open workspace restored':''}`:restoredCurrent?' · open Synthetic Forge workspace restored':'';
  assert.equal(api.fragment('forgeWorkspaces',{saved,restoredCurrent}),legacy);
 }
for(const count of [0,1,8])assert.equal(api.fragment('mirror',{importedCount:count}),count?` · ${count} local browser-library entries mirrored`:'');
for(const imported of [0,4])for(const skipped of [0,2])for(const replaced of [0,3]){
 const a={present:true,importedCount:imported,skippedCount:skipped,replacedCount:replaced};
 const legacy=` · ${imported} Room III constellation(s) imported${skipped?` · ${skipped} already present`:''}${replaced?` · ${replaced} replaced`:''}`;
 assert.equal(api.fragment('nodal',a),legacy);
}
assert.equal(api.fragment('nodal',{present:false,importedCount:3}),'');
const scenarios=[
 [{kind:'bank',restored:4,original:4},' · 4 Root Follow loop(s) restored'],
 [{kind:'bank',restored:0,original:6},' · Root Follow bank without a valid Material Track'],
 [{kind:'bank',restored:0,original:0},''],
 [{kind:'legacy',restored:2},' · 2 Root Follow loop(s) activated from older package marker'],
 [{kind:'legacy',restored:0},' · 0 Root Follow loop(s) activated from older package marker'],
 [{kind:'cleared'},' · Root-Follow-Bank geleert'],
 [{kind:'none'},'']
];
for(const [arg,want] of scenarios)assert.equal(api.fragment('rootFollow',arg),want);
assert.throws(()=>api.fragment('unknown',{}),/unknown|fragment/i);
assert.throws(()=>api.fragment('rootFollow',{kind:'future'}),/unknown|kind/i);
const a=Object.freeze({importedCount:2,skippedCount:1,replacedCount:3});
assert.equal(api.fragment('nodal',{...a,present:true}),' · 2 Room III constellation(s) imported · 1 already present · 3 replaced');
assert.deepEqual(a,{importedCount:2,skippedCount:1,replacedCount:3},'input must be untouched');
const source=read('src/app/forge/03_spectral_grid_and_archives.js');
const begin=source.indexOf('async function _Q(e)'),end=source.indexOf('return te(),{mode:"merge"',begin);
assert(begin>=0&&end>begin,'original import function must remain');
const body=source.slice(begin,end);
for(const key of ['sample','grid','forgeWorkspaces','mirror','nodal','rootFollow'])
 assert(body.includes(`__XenWorkspaceResultProjectionP32.fragment('${key}'`),`${key} must be projected rather than inline formatted`);
for(const snippet of ['samples replaced incrementally','grids imported','saved Synthetic Forge workspaces imported','local browser-library entries mirrored','Room III constellation(s) imported','Root Follow loop(s) restored'])
 assert(!body.includes(snippet),`legacy status formatting still resides in importer: ${snippet}`);
// Two security gates & sequence of Root-Follow bank writes must remain in the importer.
assert(body.indexOf('__XenReferenceIntegrityP25.assertSafe')<body.indexOf('n.samples.imported=b'));
assert(body.indexOf('const Y=L?.importedIdMap')<body.indexOf('const __forgeImported'));
console.log('P3.3 PASS: six pure fragments, legacy text equivalence, safety order and wiring');
