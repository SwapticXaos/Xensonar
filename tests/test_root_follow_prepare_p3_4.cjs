'use strict';
// P3.4 red/green: Root-Follow restoration preparation is read-only and separated from persistence.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const context=vm.createContext({Object,Set,Map,TypeError});
vm.runInContext(read('src/contracts/13_root_follow_import_plan.js'),context);
const api=vm.runInContext('__XenRootFollowImportP34',context);
assert.equal(typeof api.prepare,'function');
assert.equal(typeof api.resolve,'function');
const idMap=new Map([['old-a','new-a'],['old-b','new-b']]);
const validIds=new Set(['new-a','other']);
let remapCalls=0, legacyCalls=0, merges=0, clears=0;
const normalizeBank=({payload,idMap,validIds})=>{
  remapCalls++;
  const mapped=payload.memberIds.map(id=>idMap.get(id)??id);
  return {memberIds:mapped.filter(id=>!validIds||validIds.has(id)),orderedIds:mapped.filter(id=>!validIds||validIds.has(id))};
};
const reconstructLegacy=({archiveMaterialLibrary,materialIdMap,validMaterialIds})=>{
  legacyCalls++;
  const ids=(archiveMaterialLibrary?.entries||[]).filter(e=>e.rootFollowPreferred)
    .map(e=>materialIdMap.get(e.archivedId)??e.archivedId).filter(id=>validMaterialIds.has(id));
  return ids.length?{memberIds:ids,orderedIds:ids}:null;
};
const mergeBank=({current,imported,mode})=>{
  merges++;
  if(mode==='replace')return imported;
  const items=[...new Set([...current.memberIds,...imported.memberIds])];
  return {memberIds:items,orderedIds:items};
};
const emptyBank=()=>{clears++;return {memberIds:[],orderedIds:[]};};
const prepare=(bank,lib,mode='merge')=>api.prepare({rootFollowBank:bank,archiveMaterialLibrary:lib,
 materialIdMap:idMap,validMaterialIds:validIds,mode,normalizeBank,reconstructLegacy});
const resolve=(p,mode='merge')=>api.resolve({prepared:p,mode,currentBank:{memberIds:['other'],orderedIds:['other']},mergeBank,emptyBank});
const bank=Object.freeze({memberIds:Object.freeze(['old-a','old-b']),orderedIds:Object.freeze(['old-a','old-b'])});
const p=prepare(bank,null);
assert.equal(p.kind,'bank');
assert.equal(p.originalCount,2);
assert.deepEqual([...p.unresolvedMaterialRefs],['old-b']);
assert.equal(p.imported.memberIds.join(','),'new-a');
assert.equal(merges,0,'preparation must not touch current bank');
const r=resolve(p);
assert.equal(r.bank.memberIds.join(','),'other,new-a');
assert.equal(r.ledger.imported,1);
assert.equal(r.ledger.importedBankEntries,1);
assert.equal(r.ledger.unresolvedMaterialRefs.join(','),'old-b');
assert.equal(r.ledger.activatedEntryId,'other');
assert.equal(r.report.kind,'bank');
assert.equal(r.report.restored,1);
assert.equal(r.report.original,2);
assert.equal(r.ledger.present,undefined,'bank was already marked present during ledger setup');
assert.equal(bank.memberIds.join(','),'old-a,old-b','do not mutate archived bank');
// Historical special case: with no valid local material IDs, explicit banks
// are normalized WITHOUT a validity filter; only the legacy reconstruction
// continues to filter against the empty Set.
const allUnknown=api.prepare({rootFollowBank:bank,archiveMaterialLibrary:null,
 materialIdMap:idMap,validMaterialIds:new Set(),mode:'merge',normalizeBank,reconstructLegacy});
assert.equal(allUnknown.imported.memberIds.join(','),'new-a,new-b');
assert.equal(allUnknown.unresolvedMaterialRefs.length,0);
// Differential uses the same merge adapter, not the replace clearing path.
const differential=prepare(bank,null,'differential');
const differentialResult=resolve(differential,'differential');
assert.equal(differentialResult.bank.memberIds.join(','),'other,new-a');
assert.equal(differentialResult.report.kind,'bank');

const legacy=prepare(null,{entries:[{archivedId:'old-a',rootFollowPreferred:true}]});
assert.equal(legacy.kind,'legacy');
const lr=resolve(legacy);
assert.equal(lr.ledger.present,true);
assert.equal(lr.ledger.reconstructedLegacyEntries,1);
assert.equal(lr.report.kind,'legacy');
const missing=prepare(null,{entries:[{archivedId:'old-b',rootFollowPreferred:true}]});
assert.equal(missing.kind,'none');
const inactive=prepare(null,null);
assert.equal(inactive.kind,'none');
assert.equal(api.resolve({prepared:inactive,mode:'merge',mergeBank,emptyBank}).kind,'none');
assert.equal(merges,3,'no merge should run on absent/invalid legacy bank');
const cleared=prepare(null,null,'replace');
assert.equal(cleared.kind,'cleared');
const cr=api.resolve({prepared:cleared,mode:'replace',mergeBank,emptyBank});
assert.equal(cr.kind,'cleared');
assert.equal(cr.ledger.present,true);
assert.equal(cr.report.kind,'cleared');
assert.equal(clears,1);
assert.equal(merges,3);
assert.equal(remapCalls,3);
assert.equal(legacyCalls,4,'legacy scan must preserve old conditional flow');
assert.throws(()=>prepare(null,null,'invalid'),/mode/i);
assert.throws(()=>api.resolve({prepared:p,mode:'merge',mergeBank:null}),/merge/i);
// Source-level guard for production flow and preservation of downstream ordering.
assert(!/\bwindow\.|globalThis\.|indexedDB\.(?:open|deleteDatabase)|localStorage\.(?:setItem|getItem)|\.dispatchEvent\(/.test(read('src/contracts/13_root_follow_import_plan.js')), 'planner must not own I/O');
const source=read('src/app/forge/03_spectral_grid_and_archives.js');
const start=source.indexOf('async function _Q(e)');
const end=source.indexOf('const __forgeImported=',start);
const body=source.slice(start,end);
assert(body.includes('__XenRootFollowImportP34.prepare('));
assert(body.includes('__XenRootFollowImportP34.resolve('));
assert(body.includes('UA(__rootP34Resolution.bank)'));
assert(body.includes('Object.assign(n.rootFollow,__rootP34Resolution.ledger)'));
assert(!body.includes('nFe({payload:t.rootFollowBank'),'old direct bank decoder must be behind pure preparation');
assert(!body.includes('GLe({archiveMaterialLibrary:t.materialLibrary'),'old direct legacy decoder must be behind pure preparation');
const manifest=JSON.parse(read('source-manifest.json'));
const files=manifest.sources.flatMap(s=>s.files);
assert(files.includes('src/contracts/13_root_follow_import_plan.js'));
assert(files.indexOf('src/contracts/13_root_follow_import_plan.js')<files.indexOf('src/app/forge/03_spectral_grid_and_archives.js'));
console.log('P3.4 PASS: pure preparation, reference remap, legacy, merge, replace clearing and wiring');
