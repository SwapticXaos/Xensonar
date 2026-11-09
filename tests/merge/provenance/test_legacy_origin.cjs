'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(process.env.XEN_HTML||path.join(__dirname,'..','base.html'),'utf8');
const start='/* XEN-M3B0-BEGIN: read-only origin ownership resolver */',end='/* XEN-M3B0-END */';
const a=html.indexOf(start),b=html.indexOf(end);assert.ok(a>=0&&b>a);
function api(){const sandbox={window:{},console,Promise};vm.createContext(sandbox);vm.runInContext(html.slice(a,b+end.length),sandbox);return sandbox.window.__XenOriginInspector;}
const forge=(id='sf-7')=>({id,snapshot:{version:'spectral-forge-project-v1',spectralSnapshot:new Float32Array([0.1]),materialExport:{bars:4}}});
const legacy=(id='entry-7',project='sf-7')=>({id,blob:{size:13000},renderMode:'carrier-integral-field',workspaceOrigin:'spectralforge-carrier-integral',audioPaintImportDetailJson:JSON.stringify({entryId:id,carrierProjectId:project,carrierProjectName:'Listening: Cecilia',machineId:'branch-c-interval-body',config:{synthPattern:{notes:[{durationBeats:1}]}}})});
const owners=(asset, project=forge(),calls=[])=>({readMaterial:async id=>id===asset.id?asset:null,readProject:async(editor,id)=>{calls.push({editor,id});return editor==='spectral-forge'&&id===project?.id?project:null}});
test('existing persisted audioPaintImportDetailJson resolves exact Spectral Forge project (no new link)',async()=>{
 const x=legacy(),reads=[];const r=await api().inspectWithOwners({targetKind:'rootFollow',entryId:x.id},owners(x,forge(),reads));assert.equal(r.status,'verified-project');assert.equal(r.editor,'spectral-forge');assert.equal(r.sourceId,'sf-7');assert.deepEqual(reads,[{editor:'spectral-forge',id:'sf-7'}]);assert.equal(x.originProjectRef,undefined);
});
test('same existing provenance works in Material Track',async()=>{const x=legacy();assert.equal((await api().inspectWithOwners({targetKind:'material',entryId:x.id},owners(x))).sourceId,'sf-7');});
test('deleted carrier project refuses a title-based replacement',async()=>{const x=legacy();const r=await api().inspectWithOwners({targetKind:'rootFollow',entryId:x.id},owners(x,null));assert.equal(r.status,'unavailable');assert.equal(r.sourceId,undefined);});
test('mismatched entryId does not bind a carrier from another material',async()=>{const x=legacy('entry-7');x.audioPaintImportDetailJson=JSON.stringify({entryId:'entry-8',carrierProjectId:'sf-7',machineId:'branch-c-interval-body'});const reads=[];const r=await api().inspectWithOwners({targetKind:'material',entryId:x.id},owners(x,forge(),reads));assert.equal(r.status,'incompatible');assert.equal(r.sourceId,undefined);assert.equal(reads.length,0);});
test('names and listening mode without carrierProjectId never yield a verified project',async()=>{const x=legacy();x.audioPaintImportDetailJson=JSON.stringify({entryId:x.id,carrierProjectName:'Cecilia',machineId:'branch-c-interval-body'});const reads=[];const r=await api().inspectWithOwners({targetKind:'material',entryId:x.id},owners(x,forge(),reads));assert.notEqual(r.status,'verified-project');assert.equal(reads.length,0);});
test('explicit modern ref takes precedence over old carrier detail (no ambiguous fallback)',async()=>{const x=legacy();x.originProjectRef={schemaVersion:1,editor:'melodic-loop',projectId:'M1'};const calls=[];const r=await api().inspectWithOwners({targetKind:'material',entryId:x.id},{readMaterial:async()=>x,readProject:async(editor,id)=>{calls.push([editor,id]);return null;}});assert.equal(r.status,'unavailable');assert.deepEqual(calls,[['melodic-loop','M1']]);});
test('corrupt legacy JSON does not trigger project guessing',async()=>{const x=legacy();x.audioPaintImportDetailJson='{bad';const calls=[];const r=await api().inspectWithOwners({targetKind:'material',entryId:x.id},owners(x,forge(),calls));assert.notEqual(r.status,'verified-project');assert.equal(calls.length,0);});
test('inspector remains purely read-only and does not mutate the material',async()=>{const x=legacy();Object.freeze(x);const before=JSON.stringify(x);const r=await api().inspectWithOwners({targetKind:'rootFollow',entryId:x.id},Object.freeze({...owners(x),write:()=>{throw Error('write forbidden')}}));assert.equal(r.status,'verified-project');assert.equal(JSON.stringify(x),before);});
test('package->IndexedDB adapter preserves existing audio-paint detail field',()=>{
 assert.match(html,/audioPaintImportDetailJson:e\.audioPaintImportDetailJson/);
 assert.match(html,/audioPaintImportDetailJson:e\.renderInfo\?\.audioPaintImportDetailJson/);
 assert.match(html,/audioPaintImportDetailJson:e\.renderInfo\?\.audioPaintImportDetailJson/);
});
