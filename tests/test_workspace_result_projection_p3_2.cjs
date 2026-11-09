'use strict';
// P3.2 RED/GREEN: the UI summary derives from pure library projections, never storage actions.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ctx=vm.createContext({Object,TypeError});
vm.runInContext(read('src/contracts/12_workspace_result_projection.js'),ctx);
const api=vm.runInContext('__XenWorkspaceResultProjectionP32',ctx);
const norm=x=>JSON.parse(JSON.stringify(x));
const fixture={importedCount:4,skippedCount:2,replacedCount:1,dedupedCount:3,
  importedIdMap:new Map([['a','b'],['c','d']]),touchedIds:new Set(['a']),playlistImported:true};
const expectations={
  material:{ledger:{imported:4,reused:2,skipped:2,replaced:1,deduped:3,remapped:2,touched:1},suffix:' · 4 Material Tracks imported · 2 already present · 1 incrementally replaced · 3 Material Track duplicates removed'},
  bass:{ledger:{imported:4,reused:2,skipped:2,replaced:1,deduped:3},suffix:' · 4 bass patterns/lines imported · 2 already present · 1 incrementally replaced'},
  drums:{ledger:{imported:4,reused:2,skipped:2,replaced:1,deduped:3,playlistImported:true},suffix:' · 4 drum pattern(s) imported · 2 already present · 1 incrementally replaced · Drum Playlist applied'},
  forgeProjects:{ledger:{imported:4,reused:2,skipped:2,replaced:1,deduped:3},suffix:' · 4 Spectral Forge project(s) imported · 2 already present · 1 incrementally replaced'},
  forgeStamps:{ledger:{imported:4,reused:2,skipped:2,replaced:1,deduped:3},suffix:' · 4 Spectral Forge stamps imported · 2 already present · 1 incrementally replaced'}
};
for(const [name,expected] of Object.entries(expectations)){
  const result=api.library(name,fixture);
  assert.deepEqual(norm(result),expected,name+' legacy output equivalence');
  assert.equal(api.library(name,null),null,'absent phase is silent');
  assert.equal(api.library(name,false),null,'falsy phase follows legacy');
  const allZeros={importedCount:0,skippedCount:0,replacedCount:0,dedupedCount:0,importedIdMap:new Map(),touchedIds:new Set(),playlistImported:false};
  const zero=api.library(name,allZeros);
  assert(zero.suffix.includes(' · 0 '),name+' retains zero-count message');
  assert(!zero.suffix.includes('already present'));
}
assert.throws(()=>api.library('unknown',fixture),/unknown|phase|library/i);
assert.throws(()=>api.library('material',{importedCount:1}),/importedIdMap|touchedIds|size/i);
assert.equal(api.tail({settingsCount:0,summary:'0 imported',donor:null,forge:null,forgeApplied:false}),' · 0 imported');
assert.equal(api.tail({settingsCount:2,summary:'done',donor:{donorCount:1,workspaceCount:2,audioImported:3},forge:{workspaceCount:4,audioImported:5,activeWorkspaceImported:true},forgeApplied:false}),
  ' · Global sound and mix settings will be active after reload · done · 1 donors · 2 material recordings · 3 raw audio assets restored · 4 Forge-Experimentstände · 5 Forge-Audio-Assets · reopen Forge to activate');
assert.equal(api.tail({settingsCount:0,summary:'x',donor:null,forge:{workspaceCount:0,audioImported:0,activeWorkspaceImported:true},forgeApplied:true}),
  ' · x · 0 Forge-Experimentstände · 0 Forge-Audio-Assets · active Forge workspace restored');
const segments={sample:'<s>',grid:'<g>',material:'<m>',bass:'<b>',drums:'<d>',forgeProjects:'<fp>',forgeStamps:'<fs>',forgeWorkspaces:'<fw>',nodal:'<n>',mirror:'<mir>',rootFollow:'<rf>'};
const common='2 samples · 3 projects <s><g><m><b><d><fp><fs><fw><n><mir><rf>. · END';
assert.equal(api.status({mode:'merge',sampleCount:2,projectCount:3,segments,tail:' · END'}),`Workspace Package added additively: 2 samples · 3 projects added <s><g><m><b><d><fp><fs><fw><n><mir><rf>. · END`);
assert.equal(api.status({mode:'replace',sampleCount:2,projectCount:3,segments,tail:' · END'}),`Workspace Package loaded as a local working copy: ${common}`);
assert.equal(api.status({mode:'differential',sampleCount:2,projectCount:3,segments,tail:' · END'}),`Workspace Package combined differentially as a working copy: ${common}`);
assert.throws(()=>api.status({mode:'invalid',sampleCount:0,projectCount:0,segments,tail:''}),/mode/i);
const source=read('src/app/forge/03_spectral_grid_and_archives.js');
const begin=source.indexOf('async function _Q(e)');const end=source.indexOf('return te(),{mode:"merge"',begin);
assert(begin>=0&&end>begin);
const body=source.slice(begin,end+270);
assert(body.includes('__XenWorkspaceResultProjectionP32.library('));
for(const name of Object.keys(expectations))assert(body.includes(`__XenWorkspaceResultProjectionP32.library('${name}'`),name+' wired');
assert(body.includes('__XenWorkspaceResultProjectionP32.status('),'final status projection must move out of orchestration');
assert(!body.includes('bass patterns/lines imported') && !body.includes('Material Tracks imported'),'UI strings not constructed inside orchestrator');
// New pure projector must be included before the importer in the same module scope.
const files=JSON.parse(read('source-manifest.json')).sources.flatMap(section=>section.files);
assert(files.indexOf('src/contracts/12_workspace_result_projection.js')>files.indexOf('src/contracts/11_workspace_library_phases.js'));
assert(files.indexOf('src/contracts/12_workspace_result_projection.js')<files.indexOf('src/app/forge/03_spectral_grid_and_archives.js'));
console.log('P3.2 PASS: pure output equivalence, all five libraries, summary variants and source wiring');
